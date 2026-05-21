import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/shared/api';
import { getAccessToken } from './auth-token';
import { useAuthStore } from '../model/store';
import type { AuthUser } from '../model/types';

interface MeResponse {
  id: string;
  email: string;
  role: AuthUser['role'];
}

async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<MeResponse>('/auth/me');
  return { id: data.id, email: data.email, role: data.role };
}

/**
 * 현재 사용자 — 모바일 부팅 시 토큰 검증과 동일 패턴.
 * 토큰 없으면 query 비활성. 200 응답 시 Zustand user 갱신은 호출처가 책임.
 */
export function useMeQuery() {
  const token = typeof window === 'undefined' ? null : getAccessToken();
  return useQuery<AuthUser, Error>({
    queryKey: queryKeys.auth.me(),
    queryFn: fetchMe,
    enabled: token !== null,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** test 등에서 store 갱신을 호출처가 수행 — useEffect 패턴 */
export function syncMeToStore(user: AuthUser | undefined): void {
  if (user) useAuthStore.getState().setUser(user);
}
