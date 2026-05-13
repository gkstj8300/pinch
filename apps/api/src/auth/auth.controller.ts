import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { CurrentUserContext } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Slice 2 개발용 로그인. OTP 없이 phone 만으로 JWT 발급.
   * Slice 3 에서 OTP 검증 endpoint(`/auth/otp/verify`)로 교체.
   */
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(@Body() dto: DevLoginDto) {
    return this.auth.devLogin(dto);
  }

  /**
   * JWT 검증 + 자신의 사용자 컨텍스트 반환 (헬스체크 용도).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: CurrentUserContext) {
    return {
      id: user.id.toString(),
      phone: user.phone,
      role: user.role,
    };
  }
}
