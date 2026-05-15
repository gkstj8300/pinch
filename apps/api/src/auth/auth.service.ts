import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import type { JwtPayload } from './types';
import type { LoginDto } from './dto/login.dto';
import type { SignupDto } from './dto/signup.dto';

const BCRYPT_SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * 이메일+비밀번호 회원가입 → 가입 직후 JWT 발급 (자동 로그인).
   * 워커앱 전용이므로 role=WORKER 고정.
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
        // unique 제약 충돌 — meta.target 으로 어느 컬럼인지 식별
        const target = Array.isArray(e.meta?.target) ? e.meta.target.join(',') : '';
        if (target.includes('email')) throw new ConflictException('EMAIL_TAKEN');
        if (target.includes('name')) throw new ConflictException('NAME_TAKEN');
        throw new ConflictException('DUPLICATE');
      }
      throw e;
    }
  }

  /**
   * 이메일+비밀번호 로그인.
   * 이메일 존재 여부를 누설하지 않기 위해 미존재/비밀번호 불일치 모두 동일한 401.
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
   * 같은 (provider, providerId) 사용자가 있으면 그대로 로그인.
   * 없으면 신규 가입 — 단, 이메일이 이미 자체 가입 계정에 사용 중이면 409.
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

    // 이메일 충돌 검사 — 같은 이메일로 password 가입한 사용자가 있으면 거부
    const emailOwner = await this.prisma.user.findFirst({
      where: { email: params.email, deletedAt: null },
    });
    if (emailOwner) {
      throw new ConflictException('EMAIL_TAKEN_BY_LOCAL');
    }

    try {
      // name 충돌 시 suffix 자동 부여 — 별명은 unique 제약이라
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

  private async buildAuthResult(user: User): Promise<AuthResult> {
    const accessToken = await this.signAccessToken(user);
    return {
      accessToken,
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
}
