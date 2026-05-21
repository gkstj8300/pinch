import { create } from 'zustand';
import {
  apiClient,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/shared/api/apiClient';
import type { AuthUser } from './types';

/**
 * 인증 사용자 컨텍스트 — 메모리 캐시.
 * JWT 는 localStorage 에 별도 저장 (shared/api/apiClient).
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
 * 로그아웃 — 백엔드 /auth/logout 호출(best-effort) + localStorage 양 토큰 +
 * Zustand user 동시 무효화. 네트워크 실패해도 로컬 무효화는 끝까지 수행.
 */
export async function clearSession(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh !== null) {
    try {
      await apiClient.post('/auth/logout', { refreshToken: refresh });
    } catch {
      // best-effort
    }
  }
  setAccessToken(null);
  setRefreshToken(null);
  useAuthStore.getState().clearUser();
}
