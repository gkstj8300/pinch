/**
 * useLoginMutation — 200 OK / 401 / NotClientError 시나리오.
 * Next.js useRouter 가 아닌 hook 자체만 테스트 (form 통합 테스트는 후속).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { NotClientError, useLoginMutation } from '../useLoginMutation';
import { apiClient } from '@/shared/api/apiClient';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '@/shared/api/apiClient';
import { useAuthStore } from '@/entities/user/model/store';

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const clientResponse = {
  data: {
    accessToken: 'jwt.access',
    refreshToken: 'jwt.refresh',
    user: {
      id: '1',
      email: 'client@pinch.local',
      name: '테스트사업주',
      role: 'CLIENT' as const,
      isVerified: false,
    },
  },
};

const workerResponse = {
  data: {
    ...clientResponse.data,
    user: { ...clientResponse.data.user, role: 'WORKER' as const, email: 'worker001@pinch.local' },
  },
};

describe('useLoginMutation', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    setAccessToken(null);
    setRefreshToken(null);
    vi.restoreAllMocks();
  });

  it('CLIENT 정상 — 양 토큰 저장 + user 갱신', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce(clientResponse);

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({ email: 'client@pinch.local', password: 'pinch1234!' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getAccessToken()).toBe('jwt.access');
    expect(getRefreshToken()).toBe('jwt.refresh');
    expect(useAuthStore.getState().user).toEqual({
      id: '1',
      email: 'client@pinch.local',
      role: 'CLIENT',
    });
  });

  it('WORKER 응답 — NotClientError + 토큰/user 무효화', async () => {
    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce(workerResponse)        // /auth/login 응답
      .mockResolvedValueOnce({ data: '' });          // clearSession 의 /auth/logout

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({ email: 'worker001@pinch.local', password: 'pinch1234!' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(NotClientError);
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('401 INVALID_CREDENTIALS — error 전파, 토큰 미저장', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new Error('Request failed with status code 401'),
    );

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({ email: 'client@pinch.local', password: 'wrong' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
