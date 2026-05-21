/**
 * 환경 변수 — Next.js 의 `NEXT_PUBLIC_*` 컨벤션 (빌드 시 클라이언트에 인라인).
 * 시크릿은 server-only 모듈로 분리 (1차에서는 미사용).
 *
 * KAKAO_REST_API_KEY 는 카카오 콘솔의 REST API key — 카카오는 client identifier
 * 로 분류 (공개 가능). 카카오 콘솔의 허용 도메인 제한으로 보호.
 */
export const env = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  KAKAO_REST_API_KEY: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? '',
} as const;
