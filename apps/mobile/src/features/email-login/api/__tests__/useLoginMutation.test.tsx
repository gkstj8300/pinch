/**
 * useLoginMutation 통합 단위 테스트.
 *  - apiClient.post 를 jest.spyOn 으로 mock — 네트워크 없이 응답 시나리오 주입
 *  - renderHook + QueryClientProvider wrapper 로 mutation 라이프사이클 검증
 *  - onSuccess 부수효과: SecureStore 에 accessToken 저장 + useAuthStore.user 갱신
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLoginMutation } from '../useLoginMutation';
import { apiClient } from '@/shared/api/apiClient';
import { getAccessToken, setAccessToken } from '@/shared/api/apiClient';
import { useAuthStore } from '@/entities/user/model/store';

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const successResponse = {
  data: {
    accessToken: 'jwt.token.value',
    user: {
      id: '42',
      email: 'worker001@pinch.local',
      name: '워커001',
      role: 'WORKER' as const,
      isVerified: false,
    },
  },
};

describe('useLoginMutation', () => {
  beforeEach(async () => {
    useAuthStore.setState({ user: null });
    await setAccessToken(null);
    jest.restoreAllMocks();
  });

  it('on 200 OK — persists accessToken and sets user in store', async () => {
    const postSpy = jest
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce(successResponse);

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({
        email: 'worker001@pinch.local',
        password: 'pinch1234!',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postSpy).toHaveBeenCalledWith('/auth/login', {
      email: 'worker001@pinch.local',
      password: 'pinch1234!',
    });
    await expect(getAccessToken()).resolves.toBe('jwt.token.value');
    expect(useAuthStore.getState().user).toEqual({
      id: '42',
      email: 'worker001@pinch.local',
      name: '워커001',
      role: 'WORKER',
    });
  });

  it('on 401 — does not save token or user, surfaces error', async () => {
    jest
      .spyOn(apiClient, 'post')
      .mockRejectedValueOnce(new Error('Request failed with status code 401'));

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({
        email: 'worker001@pinch.local',
        password: 'wrong-password',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/401/);
    await expect(getAccessToken()).resolves.toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('on network error — does not touch token or user', async () => {
    jest
      .spyOn(apiClient, 'post')
      .mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({
        email: 'worker001@pinch.local',
        password: 'pinch1234!',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await expect(getAccessToken()).resolves.toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
