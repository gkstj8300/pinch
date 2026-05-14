import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/shared/api';
import type { AuthUser } from '../model/types';

async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

/**
 * 현재 로그인 사용자 컨텍스트 조회.
 *   - apiClient interceptor 가 SecureStore JWT 를 자동 Bearer 주입
 *   - 401 응답 시 interceptor 가 토큰 무효화
 *   - 호출자(splash 화면 등)는 isError 시 /login 으로 redirect
 *
 * options.enabled 로 토큰 존재 여부에 따른 조건부 실행 제어.
 */
export function useMeQuery(
  options?: Pick<UseQueryOptions<AuthUser, Error>, 'enabled'>,
) {
  return useQuery<AuthUser, Error>({
    queryKey: queryKeys.auth.me(),
    queryFn: fetchMe,
    enabled: options?.enabled ?? true,
    retry: 1,
    staleTime: 60_000,
  });
}
