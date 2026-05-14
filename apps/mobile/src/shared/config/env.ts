/**
 * 환경 변수 — Expo 의 EXPO_PUBLIC_* 컨벤션.
 * 빌드 시 인라인되므로 클라이언트 노출 무관한 값만 담는다 (시크릿 ❌).
 *
 * KAKAO_REST_API_KEY 는 카카오 OAuth 의 client identifier 역할 — 카카오
 * 측에서 공개 가능한 값으로 분류. (KAKAO_CLIENT_SECRET 은 백엔드 전용)
 */
export const env = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  KAKAO_REST_API_KEY: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '',
} as const;
