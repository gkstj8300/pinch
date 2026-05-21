import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;        // user id (BigInt stringified)
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Refresh token 의 JWT payload — access 와 별도 secret 으로 sign.
 *  - tid: refresh_tokens.id (lookup key). DB 의 단일 row 만 fetch 후 1회 bcrypt 검증.
 */
export interface RefreshJwtPayload {
  sub: string;        // user id
  tid: string;        // refresh_tokens.id
  iat?: number;
  exp?: number;
}

export interface CurrentUserContext {
  id: bigint;
  email: string;
  role: UserRole;
}
