import { create } from 'zustand';
import type { UserRole } from './types';

/**
 * 인증 사용자 컨텍스트 — 메모리 캐시.
 * JWT 자체는 SecureStore 에 별도 저장 (`shared/api/apiClient`).
 *
 * 다음 브랜치(로그인 화면)에서 setUser/clearUser 호출.
 */
export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  name?: string;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
