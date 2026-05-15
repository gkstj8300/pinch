import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;        // user id (BigInt stringified)
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface CurrentUserContext {
  id: bigint;
  email: string;
  role: UserRole;
}
