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
 * 로그아웃 — 백엔드 refresh 무효화 + SecureStore 양쪽 토큰 + Zustand user 동시 무효화.
 *   - /auth/logout 은 best-effort: 네트워크 실패해도 로컬 무효화는 끝까지 수행
 *   - 호출처: 로그아웃 버튼, 계정 삭제 등
 */
export async function clearSession(): Promise<void> {
  const refresh = await getRefreshToken();
  if (refresh !== null) {
    try {
      await apiClient.post('/auth/logout', { refreshToken: refresh });
    } catch {
      // best-effort — 로컬 무효화는 아래에서 보장
    }
  }
  await setAccessToken(null);
  await setRefreshToken(null);
  useAuthStore.getState().clearUser();
}
