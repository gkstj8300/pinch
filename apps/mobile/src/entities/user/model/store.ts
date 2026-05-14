import { create } from 'zustand';
import { setAccessToken } from '@/shared/api/apiClient';
import type { AuthUser } from './types';

/**
 * 인증 사용자 컨텍스트 — 메모리 캐시.
 * JWT 자체는 SecureStore 에 별도 저장 (`shared/api/apiClient`).
 */
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

/**
 * 로그아웃 — SecureStore 토큰 + Zustand user 동시 무효화.
 * 호출처: 로그아웃 버튼, 401 인터셉터 후속, 계정 삭제 등.
 */
export async function clearSession(): Promise<void> {
  await setAccessToken(null);
  useAuthStore.getState().clearUser();
}
