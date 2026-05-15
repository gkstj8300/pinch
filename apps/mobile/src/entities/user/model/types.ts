/**
 * UserRole — 백엔드(@prisma/UserRole) 와 1:1 매핑.
 * 추후 packages/api-types 로 이전 검토.
 */
export type UserRole = 'WORKER' | 'CLIENT' | 'ADMIN';

/**
 * 인증된 사용자 컨텍스트 — GET /auth/me 응답 + 클라이언트 캐시 모델.
 * 본인인증(Slice 3) 추가 필드는 후속 plan 에서 확장.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
