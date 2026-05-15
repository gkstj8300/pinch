import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
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
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    jwt = {
      signAsync: jest.fn().mockResolvedValue('fake-jwt'),
    } as unknown as jest.Mocked<JwtService>;
    service = new AuthService(prisma, jwt);
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
      expect(result.user.email).toBe('new@pinch.local');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '42', email: 'new@pinch.local', role: UserRole.WORKER }),
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
});
