import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, type RefreshToken, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import type { JwtPayload, RefreshJwtPayload } from './types';
import type { LoginDto } from './dto/login.dto';
import type { SignupDto } from './dto/signup.dto';

const BCRYPT_SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
  };
}

type PrismaTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
    this.refreshSecret = secret;
    this.refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '14d';
  }

  /**
   * 이메일+비밀번호 회원가입 → 가입 직후 access+refresh 한 쌍 발급 (자동 로그인).
   */
  async signup(dto: SignupDto): Promise<AuthResult> {
    if (!dto.termsAgreed) {
      throw new BadRequestException('TERMS_REQUIRED');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const now = new Date();

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: UserRole.WORKER,
          termsAgreedAt: now,
          marketingConsentedAt: dto.marketingConsented ? now : null,
        },
      });
      return this.buildAuthResult(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = Array.isArray(e.meta?.target) ? e.meta.target.join(',') : '';
        if (target.includes('email')) throw new ConflictException('EMAIL_TAKEN');
        if (target.includes('name')) throw new ConflictException('NAME_TAKEN');
        throw new ConflictException('DUPLICATE');
      }
      throw e;
    }
  }

  /**
   * 이메일+비밀번호 로그인. 미존재/비밀번호 불일치 모두 동일 401 (enumeration 방지).
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.buildAuthResult(user);
  }

  /**
   * OAuth 가입/로그인 공통 처리.
   */
  async loginOrCreateOAuthUser(params: {
    provider: 'kakao';
    providerId: string;
    email: string;
    name: string;
  }): Promise<AuthResult> {
    const existing = await this.prisma.user.findFirst({
      where: {
        oauthProvider: params.provider,
        oauthId: params.providerId,
        deletedAt: null,
      },
    });
    if (existing) return this.buildAuthResult(existing);

    const emailOwner = await this.prisma.user.findFirst({
      where: { email: params.email, deletedAt: null },
    });
    if (emailOwner) {
      throw new ConflictException('EMAIL_TAKEN_BY_LOCAL');
    }

    try {
      const safeName = await this.resolveUniqueName(params.name);
      const user = await this.prisma.user.create({
        data: {
          email: params.email,
          oauthProvider: params.provider,
          oauthId: params.providerId,
          name: safeName,
          role: UserRole.WORKER,
          termsAgreedAt: new Date(),
        },
      });
      return this.buildAuthResult(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('OAUTH_DUPLICATE');
      }
      throw e;
    }
  }

  /**
   * Refresh token 회전.
   *  1) JWT verify (위조/만료 거부)
   *  2) tid 로 DB record 1개 fetch + bcrypt.compare 로 본인 검증
   *  3) revoked_at 이 채워져 있으면 reuse 감지 → 해당 user 의 모든 refresh 무효화
   *  4) 정상이면 트랜잭션 안에서 기존 record 회전 + 새 access+refresh 한 쌍 발급
   */
  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshJwtPayload>(rawRefreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('INVALID_REFRESH');
    }

    const userId = BigInt(payload.sub);
    const tokenId = BigInt(payload.tid);

    const record = await this.prisma.refreshToken.findFirst({
      where: { id: tokenId, userId },
    });
    if (!record) {
      throw new UnauthorizedException('INVALID_REFRESH');
    }

    const hashOk = await bcrypt.compare(rawRefreshToken, record.tokenHash);
    if (!hashOk) {
      throw new UnauthorizedException('INVALID_REFRESH');
    }

    if (record.revokedAt !== null) {
      // 이미 회전된(또는 logout 된) 토큰이 재사용됨 — 탈취 의심
      await this.revokeAllForUser(userId, 'REUSE_DETECTED');
      throw new UnauthorizedException('REFRESH_REUSE_DETECTED');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException('INVALID_REFRESH');
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: now, rotatedAt: now, revokeReason: 'ROTATED' },
      });
      return this.buildAuthResult(user, record.id, tx);
    });
  }

  /**
   * 로그아웃 — refresh token 무효화. idempotent (미일치/만료 모두 silent 성공).
   */
  async logout(rawRefreshToken: string): Promise<void> {
    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshJwtPayload>(rawRefreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      return; // 검증 실패도 silent 통과 (idempotent)
    }

    const tokenId = BigInt(payload.tid);
    const userId = BigInt(payload.sub);

    const record = await this.prisma.refreshToken.findFirst({
      where: { id: tokenId, userId },
    });
    if (!record || record.revokedAt !== null) return;

    const hashOk = await bcrypt.compare(rawRefreshToken, record.tokenHash);
    if (!hashOk) return;

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), revokeReason: 'LOGOUT' },
    });
  }

  private async resolveUniqueName(base: string): Promise<string> {
    const trimmed = base.trim().slice(0, 40) || '카카오워커';
    for (let suffix = 0; suffix < 1000; suffix++) {
      const candidate = suffix === 0 ? trimmed : `${trimmed}_${suffix}`;
      const exists = await this.prisma.user.findFirst({
        where: { name: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new ConflictException('NAME_RESOLUTION_FAILED');
  }

  /**
   * accessToken + refreshToken 한 쌍 발급.
   * 호출자가 트랜잭션 안에서 호출할 수 있도록 tx 를 받음 (기본은 this.prisma).
   */
  private async buildAuthResult(
    user: User,
    parentId: bigint | null = null,
    tx: PrismaTx = this.prisma,
  ): Promise<AuthResult> {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id, parentId, tx);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };
    return this.jwt.signAsync(payload);
  }

  /**
   * Refresh token 신규 발급. CHAR(60) 의 bcrypt 결과를 DB 에 저장.
   *   1) 임시 placeholder 로 record 생성 → id 확보
   *   2) JWT sign with { sub, tid: record.id }
   *   3) bcrypt.hash 후 record.token_hash + expires_at update
   * 트랜잭션 외부 호출 시 단일 prisma 로 직렬 실행 (race 가능성 무관 — record id 가 결정적).
   */
  private async issueRefreshToken(
    userId: bigint,
    parentId: bigint | null,
    tx: PrismaTx,
  ): Promise<string> {
    // placeholder 도 CHAR(60) 길이 맞춰 padding (Postgres CHAR 은 fixed-length)
    const placeholder = `_placeholder_${randomBytes(24).toString('hex')}`.slice(0, 60);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    const record = await (tx as PrismaService).refreshToken.create({
      data: {
        userId,
        tokenHash: placeholder,
        expiresAt,
        parentId,
      },
    });

    const raw = await this.jwt.signAsync(
      { sub: userId.toString(), tid: record.id.toString() } satisfies RefreshJwtPayload,
      {
        secret: this.refreshSecret,
        // @nestjs/jwt v11 SignOptions.expiresIn 의 StringValue 템플릿 리터럴
        // 타입 우회 — auth.module.ts 와 동일 패턴. 런타임은 jsonwebtoken 표준.
        expiresIn: this.refreshExpiresIn as unknown as number,
      },
    );

    const hash = await bcrypt.hash(raw, BCRYPT_SALT_ROUNDS);
    await (tx as PrismaService).refreshToken.update({
      where: { id: record.id },
      data: { tokenHash: hash },
    });

    return raw;
  }

  /**
   * Reuse 감지 시 호출 — 해당 user 의 활성 refresh 일괄 무효화.
   * 이미 revoked 된 row 는 건드리지 않음 (감사 로그 보존).
   */
  private async revokeAllForUser(
    userId: bigint,
    reason: 'REUSE_DETECTED',
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  /**
   * `JWT_REFRESH_EXPIRES_IN` 문자열을 ms 로 환산.
   * `14d`, `2h`, `30m`, `60s`, 또는 순수 숫자(초) 지원.
   */
  private refreshTtlMs(): number {
    const raw = this.refreshExpiresIn;
    const match = /^(\d+)([smhd]?)$/.exec(raw);
    if (!match) {
      throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN: ${raw}`);
    }
    const n = parseInt(match[1]!, 10);
    const unit = match[2] || 's';
    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return n * multipliers[unit]!;
  }
}

// Type tag — referenced only via JSDoc to avoid unused-import lint
export type { RefreshToken };
