import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

interface KakaoUserResponse {
  id: number;
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

export interface KakaoUserProfile {
  providerId: string;  // 카카오 user id (numeric → string)
  email: string;
  name: string;
}

@Injectable()
export class KakaoOAuthService {
  private readonly logger = new Logger(KakaoOAuthService.name);
  private readonly restApiKey: string;
  private readonly clientSecret: string | undefined;

  constructor(config: ConfigService) {
    const restApiKey = config.get<string>('KAKAO_REST_API_KEY');
    if (!restApiKey) {
      throw new Error('KAKAO_REST_API_KEY not configured');
    }
    this.restApiKey = restApiKey;
    this.clientSecret = config.get<string>('KAKAO_CLIENT_SECRET') || undefined;
  }

  /**
   * 인가 코드를 토큰으로 교환 → 사용자 정보 조회 → 정규화된 프로필 반환.
   * 호출자(AuthService)는 이 결과로 user upsert 후 JWT 발급.
   */
  async exchangeCodeForProfile(params: {
    code: string;
    redirectUri: string;
  }): Promise<KakaoUserProfile> {
    const accessToken = await this.exchangeCode(params);
    return this.fetchUser(accessToken);
  }

  private async exchangeCode(params: { code: string; redirectUri: string }): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.restApiKey,
      redirect_uri: params.redirectUri,
      code: params.code,
    });
    if (this.clientSecret) body.set('client_secret', this.clientSecret);

    const res = await fetch(KAKAO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`kakao token exchange failed: ${res.status} ${text}`);
      if (res.status === 400 || res.status === 401) {
        throw new BadRequestException('INVALID_CODE');
      }
      throw new BadGatewayException('KAKAO_API_ERROR');
    }
    const data = (await res.json()) as KakaoTokenResponse;
    return data.access_token;
  }

  private async fetchUser(accessToken: string): Promise<KakaoUserProfile> {
    const res = await fetch(KAKAO_USER_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`kakao user fetch failed: ${res.status} ${text}`);
      throw new BadGatewayException('KAKAO_API_ERROR');
    }
    const user = (await res.json()) as KakaoUserResponse;

    const email = user.kakao_account?.email;
    if (!email) {
      // 동의항목에 이메일이 빠진 경우. 카카오 콘솔 동의항목 설정 안내가 적절하나,
      // 본 작업 범위에서는 가입을 거부.
      throw new BadRequestException('KAKAO_EMAIL_REQUIRED');
    }

    const nickname =
      user.kakao_account?.profile?.nickname ?? user.properties?.nickname ?? '카카오워커';

    return {
      providerId: String(user.id),
      email,
      name: nickname,
    };
  }
}
