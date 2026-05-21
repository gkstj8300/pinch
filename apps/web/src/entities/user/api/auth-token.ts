/**
 * JWT 토큰 접근자 — entities/user 의 도메인 표면.
 * 실제 localStorage 구현은 shared/api/apiClient. 도메인 레벨 단일 표면 역할.
 */
export {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
} from '@/shared/api/apiClient';
