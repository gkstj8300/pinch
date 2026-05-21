/**
 * 환경 변수 — Next.js 의 `NEXT_PUBLIC_*` 컨벤션 (빌드 시 클라이언트에 인라인).
 * 시크릿은 server-only 모듈로 분리 (1차에서는 미사용).
 */
export const env = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
} as const;
