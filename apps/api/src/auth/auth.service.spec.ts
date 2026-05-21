import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import type { PrismaService } from '@/prisma/prisma.service';

/**
 * AuthService 단위 테스트.
 * - PrismaService 와 JwtService 는 mock
 * - bcrypt 는 실제 모듈 사용 (해시/검증 동작 검증)
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;
  let config: jest.Mocked<ConfigService>;

  function buildUser(overrides: Partial<{
    id: bigint;
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string | null;
    oauthProvider: string | null;
    oauthId: string | null;
    isVerified: boolean;
    deletedAt: Date | null;
  }> = {}) {
    return {
      id: 1n,
      email: 'worker001@pinch.local',
      passwordHash: null,
      oauthProvider: null,
      oauthId: null,
      name: '워커001',
      profileImg: null,
      role: UserRole.WORKER,
      isVerified: false,
      verificationStatus: 'UNVERIFIED' as const,
      ciHash: null,
      diHash: null,
      verifiedAt: null,
      termsAgreedAt: null,
      marketingConsentedAt: null,
      pinchScore: 1000,
      ratingAvg: new Prisma.Decimal(0),
      totalReviews: 0,
      completedCount: 0,
      noshowCount: 0,
      lateCount: 0,
      cancelCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    // RefreshToken record mock — buildAuthResult 안의 issueRefreshToken 이
    // create 로 id 받고 → JWT sign → bcrypt.hash 후 update 한다.
    let refreshTokenSeq = 0n;
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: ++refreshTokenSeq,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          parentId: data.parentId ?? null,
          rotatedAt: null,
          revokedAt: null,
          revokeReason: null,
          issuedAt: new Date(),
          createdAt: new Date(),
        })),
        update: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    } as unknown as jest.Mocked<PrismaService>;

    // access('fake-jwt') 와 refresh('fake-refresh') 를 호출 순서대로 반환.
    jwt = {
      signAsync: jest.fn().mockImplementation(async (_payload: unknown, options?: { secret?: string }) =>
        options?.secret ? 'fake-refresh' : 'fake-jwt',
      ),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    config = {
      get: jest.fn().mockImplementation((key: string) =>
        key === 'JWT_REFRESH_SECRET'
          ? 'test-refresh-secret'
          : key === 'JWT_REFRESH_EXPIRES_IN'
            ? '14d'
            : undefined,
      ),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AuthService(prisma, jwt, config);
  });

  describe('signup', () => {
    it('약관 미동의 시 400 TERMS_REQUIRED', async () => {
      await expect(
        service.signup({
          email: 'a@b.com',
          password: 'pinch1234!',
          name: '테스터',
          termsAgreed: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('정상 가입 시 bcrypt 해시 저장 + JWT 발급', async () => {
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(buildUser({ id: 42n, email: data.email, name: data.name, passwordHash: data.passwordHash })),
      );

      const result = await service.signup({
        email: 'new@pinch.local',
        password: 'pinch1234!',
        name: '신규유저',
        termsAgreed: true,
      });

      const created = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
      expect(created.email).toBe('new@pinch.local');
      expect(created.passwordHash).toBeDefined();
      expect(created.passwordHash).not.toBe('pinch1234!'); // 평문 저장 금지
      expect(await bcrypt.compare('pinch1234!', created.passwordHash)).toBe(true);
      expect(created.termsAgreedAt).toBeInstanceOf(Date);
      expect(created.marketingConsentedAt).toBeNull();

      expect(result.accessToken).toBe('fake-jwt');
      expect(result.refreshToken).toBe('fake-refresh');
      expect(result.user.email).toBe('new@pinch.local');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '42', email: 'new@pinch.local', role: UserRole.WORKER }),
      );
      // refresh sign 은 별도 secret 옵션과 함께
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '42', tid: expect.any(String) }),
        expect.objectContaining({ secret: 'test-refresh-secret' }),
      );
    });

    it('이메일 중복 시 409 EMAIL_TAKEN', async () => {
      (prisma.user.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'x',
          meta: { target: ['email'] },
        }),
      );

      await expect(
        service.signup({
          email: 'dup@pinch.local',
          password: 'pinch1234!',
          name: '중복유저',
          termsAgreed: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('별명 중복 시 409 NAME_TAKEN', async () => {
      (prisma.user.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'x',
          meta: { target: ['name'] },
        }),
      );

      await expect(
        service.signup({
          email: 'ok@pinch.local',
          password: 'pinch1234!',
          name: '중복닉네임',
          termsAgreed: true,
        }),
      ).rejects.toMatchObject({ status: 409, response: { message: 'NAME_TAKEN' } });
    });
  });

  describe('login', () => {
    it('미존재 사용자도 동일하게 401 INVALID_CREDENTIALS (이메일 enumeration 방지)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@pinch.local', password: 'pinch1234!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호 불일치 시 401', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        buildUser({ passwordHash: hash }),
      );

      await expect(
        service.login({ email: 'worker001@pinch.local', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('OAuth 전용 사용자(passwordHash null)는 비밀번호 로그인 차단', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        buildUser({ passwordHash: null, oauthProvider: 'kakao', oauthId: 'k1' }),
      );

      await expect(
        service.login({ email: 'kakao@pinch.local', password: 'pinch1234!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호 일치 시 JWT 발급', async () => {
      const hash = await bcrypt.hash('pinch1234!', 4);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        buildUser({ id: 7n, email: 'worker001@pinch.local', passwordHash: hash }),
      );

      const result = await service.login({
        email: 'worker001@pinch.local',
        password: 'pinch1234!',
      });

      expect(result.accessToken).toBe('fake-jwt');
      expect(result.refreshToken).toBe('fake-refresh');
      expect(result.user.email).toBe('worker001@pinch.local');
      expect(result.user.id).toBe('7');
    });
  });

  describe('loginOrCreateOAuthUser', () => {
    it('기존 OAuth 사용자는 그대로 로그인', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(
        buildUser({ id: 99n, oauthProvider: 'kakao', oauthId: 'k-100' }),
      );

      const result = await service.loginOrCreateOAuthUser({
        provider: 'kakao',
        providerId: 'k-100',
        email: 'kakao@pinch.local',
        name: '카카오워커',
      });

      expect(result.user.id).toBe('99');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('이메일이 자체 가입자에게 이미 점유돼 있으면 409 EMAIL_TAKEN_BY_LOCAL', async () => {
      (prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // OAuth 조회 결과
        .mockResolvedValueOnce(buildUser({ passwordHash: 'something' })); // 이메일 점유 검사

      await expect(
        service.loginOrCreateOAuthUser({
          provider: 'kakao',
          providerId: 'k-200',
          email: 'worker001@pinch.local',
          name: '워커001',
        }),
      ).rejects.toMatchObject({ status: 409, response: { message: 'EMAIL_TAKEN_BY_LOCAL' } });
    });

    it('신규 OAuth 가입은 user 생성 후 JWT 발급', async () => {
      (prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // OAuth 미존재
        .mockResolvedValueOnce(null)  // 이메일 충돌 없음
        .mockResolvedValueOnce(null); // name 충돌 없음 (resolveUniqueName 1회)
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(buildUser({ id: 123n, email: data.email, oauthProvider: data.oauthProvider, oauthId: data.oauthId, name: data.name })),
      );

      const result = await service.loginOrCreateOAuthUser({
        provider: 'kakao',
        providerId: 'k-new',
        email: 'new-kakao@pinch.local',
        name: '카카오신규',
      });

      expect(result.user.id).toBe('123');
      const created = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
      expect(created.oauthProvider).toBe('kakao');
      expect(created.oauthId).toBe('k-new');
      expect(created.passwordHash).toBeUndefined();
    });
  });

  describe('refresh', () => {
    function refreshRecord(overrides: Partial<{
      id: bigint;
      userId: bigint;
      tokenHash: string;
      expiresAt: Date;
      revokedAt: Date | null;
      revokeReason: string | null;
      rotatedAt: Date | null;
      parentId: bigint | null;
    }> = {}) {
      return {
        id: 100n,
        userId: 7n,
        tokenHash: 'PLACEHOLDER',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: null,
        revokeReason: null,
        rotatedAt: null,
        parentId: null,
        createdAt: new Date(),
        ...overrides,
      };
    }

    it('JWT verify 실패 시 401 INVALID_REFRESH', async () => {
      (jwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt malformed'));

      await expect(service.refresh('bad-token')).rejects.toMatchObject({
        status: 401,
        response: { message: 'INVALID_REFRESH' },
      });
    });

    it('DB record 미존재 시 401 INVALID_REFRESH', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('any')).rejects.toMatchObject({
        status: 401,
        response: { message: 'INVALID_REFRESH' },
      });
    });

    it('bcrypt 불일치 시 401 INVALID_REFRESH', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      const hash = await bcrypt.hash('other-raw-token', 4);
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        refreshRecord({ tokenHash: hash }),
      );

      await expect(service.refresh('wrong-raw-token')).rejects.toMatchObject({
        status: 401,
        response: { message: 'INVALID_REFRESH' },
      });
    });

    it('revoked 토큰 재사용 시 REUSE 감지 + 모든 활성 refresh 무효화', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      const rawToken = 'reused-raw-token';
      const hash = await bcrypt.hash(rawToken, 4);
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        refreshRecord({ tokenHash: hash, revokedAt: new Date(), revokeReason: 'ROTATED' }),
      );

      await expect(service.refresh(rawToken)).rejects.toMatchObject({
        status: 401,
        response: { message: 'REFRESH_REUSE_DETECTED' },
      });

      // revokeAllForUser 호출 검증
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 7n, revokedAt: null },
        data: expect.objectContaining({ revokeReason: 'REUSE_DETECTED' }),
      });
    });

    it('soft-deleted user 시 401 INVALID_REFRESH', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      const rawToken = 'valid-raw-token';
      const hash = await bcrypt.hash(rawToken, 4);
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        refreshRecord({ tokenHash: hash }),
      );
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh(rawToken)).rejects.toMatchObject({
        status: 401,
        response: { message: 'INVALID_REFRESH' },
      });
    });

    it('정상 회전 — 기존 record revoked + 새 access/refresh 발급', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      const rawToken = 'good-raw-token';
      const hash = await bcrypt.hash(rawToken, 4);
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        refreshRecord({ id: 100n, userId: 7n, tokenHash: hash }),
      );
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        buildUser({ id: 7n, email: 'worker@pinch.local' }),
      );

      const result = await service.refresh(rawToken);

      expect(result.accessToken).toBe('fake-jwt');
      expect(result.refreshToken).toBe('fake-refresh');
      expect(result.user.id).toBe('7');

      // 기존 record 회전 (revoked=ROTATED + rotatedAt)
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100n },
          data: expect.objectContaining({ revokeReason: 'ROTATED' }),
        }),
      );

      // 새 record 발급 (parentId=100)
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 7n, parentId: 100n }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('JWT verify 실패도 silent 통과', async () => {
      (jwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt malformed'));
      await expect(service.logout('garbage')).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('record 미존재도 silent 통과', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.logout('any')).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('이미 revoked 된 record 도 silent 통과', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 100n,
        userId: 7n,
        tokenHash: await bcrypt.hash('raw', 4),
        revokedAt: new Date(),
        revokeReason: 'ROTATED',
        rotatedAt: new Date(),
        parentId: null,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      });

      await expect(service.logout('raw')).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('정상 logout — record revoked=LOGOUT 으로 업데이트', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: '7', tid: '100' });
      const rawToken = 'good-raw';
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 100n,
        userId: 7n,
        tokenHash: await bcrypt.hash(rawToken, 4),
        revokedAt: null,
        revokeReason: null,
        rotatedAt: null,
        parentId: null,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      });

      await service.logout(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100n },
          data: expect.objectContaining({ revokeReason: 'LOGOUT' }),
        }),
      );
    });
  });
});
