/**
 * 환경 변수 — Expo 의 EXPO_PUBLIC_* 컨벤션.
 * 빌드 시 인라인되므로 클라이언트 노출 무관한 값만 담는다 (시크릿 ❌).
 */
export const env = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
} as const;
