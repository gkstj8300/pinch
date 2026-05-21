import { IsString, MaxLength } from 'class-validator';

/**
 * `/auth/refresh` · `/auth/logout` 공용 — refresh token 만 받는다.
 *   - refresh token 은 JWT(별도 secret) 형태로 평문 전달
 *   - 길이 한계는 운영적 가드 (정상 토큰은 ~250자 이내)
 */
export class RefreshDto {
  @IsString()
  @MaxLength(500)
  refreshToken!: string;
}
