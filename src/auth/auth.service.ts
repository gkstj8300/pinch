import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, type User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { JwtPayload } from './types';
import type { DevLoginDto } from './dto/dev-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 개발용 로그인 — OTP 검증 없이 phone 으로 즉시 JWT 발급.
   * Slice 3 에서 `POST /auth/otp/verify` 로 인터페이스만 교체될 예정.
   *
   * 동작:
   *   - 기존 사용자 있으면 그대로 사용
   *   - 없으면 생성 (역할은 body 의 role, 기본 WORKER)
   */
  async devLogin(dto: DevLoginDto) {
    let user = await this.prisma.user.findFirst({
      where: { phone: dto.phone, deletedAt: null },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          name: dto.name ?? `User-${dto.phone.slice(-4)}`,
          role: dto.role ?? UserRole.WORKER,
        },
      });
    }

    const accessToken = await this.signAccessToken(user);
    return {
      accessToken,
      user: this.serializeUser(user),
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      phone: user.phone,
      role: user.role,
    };
    // 모듈 등록 시 기본 expiresIn 설정됨. 여기서는 별도 지정 불필요.
    return this.jwt.signAsync(payload);
  }

  private serializeUser(user: User) {
    return {
      id: user.id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
    };
  }
}
