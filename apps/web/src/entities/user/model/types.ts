/**
 * UserRole — 백엔드(@prisma/UserRole) 와 1:1.
 * apps/web 는 사업주(CLIENT) 도메인이지만 type 자체는 워커앱과 동일.
 */
export type UserRole = 'WORKER' | 'CLIENT' | 'ADMIN';

/**
 * 인증된 사용자 컨텍스트 — GET /auth/me 응답 + 클라이언트 캐시.
 * v0.3.0 의 /auth/me 는 id/email/role 만 반환 — name 등 추후 확장.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
