import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;        // user id (BigInt stringified)
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface CurrentUserContext {
  id: bigint;
  phone: string;
  role: UserRole;
}
