import { IsString, IsUrl, MaxLength } from 'class-validator';

export class KakaoOAuthDto {
  /** 카카오 인가 코드 (mobile expo-auth-session 수신) */
  @IsString()
  @MaxLength(255)
  code!: string;

  /** 카카오 콘솔에 등록된 Redirect URI — 토큰 교환 시 동일해야 함 */
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(500)
  redirectUri!: string;
}
