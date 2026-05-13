import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KakaoOAuthService } from './kakao-oauth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { KakaoOAuthDto } from './dto/kakao-oauth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { CurrentUserContext } from './types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly kakao: KakaoOAuthService,
  ) {}

  @Post('signup')
  @HttpCode(201)
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /**
   * 카카오 OAuth 콜백.
   * 모바일이 expo-auth-session으로 받은 인가 코드를 전달.
   * 신규 사용자면 자동 가입, 기존이면 그대로 로그인.
   */
  @Post('oauth/kakao')
  @HttpCode(200)
  async kakaoOAuth(@Body() dto: KakaoOAuthDto) {
    const profile = await this.kakao.exchangeCodeForProfile({
      code: dto.code,
      redirectUri: dto.redirectUri,
    });
    return this.auth.loginOrCreateOAuthUser({
      provider: 'kakao',
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
    });
  }

  /**
   * JWT 검증 + 현재 사용자 컨텍스트 반환.
   * 모바일 부팅 시 자동 로그인 검증에 사용.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: CurrentUserContext) {
    return {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
    };
  }
}
