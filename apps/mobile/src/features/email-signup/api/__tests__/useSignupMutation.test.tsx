/**
 * useSignupMutation — 회원가입 후 자동 로그인 부수효과 검증.
 * 응답 형태는 useLoginMutation 과 동일 (accessToken + user). 다만 mutation 의
 * request body 는 SignupRequest 형태 (email, password, name, termsAgreed,
 * marketingConsented?) 로 전달돼야 한다.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSignupMutation } from '../useSignupMutation';
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
    accessToken: 'new.jwt.token',
    user: {
      id: '201',
      email: 'newworker@pinch.local',
      name: '새워커',
      role: 'WORKER' as const,
      isVerified: false,
    },
  },
};

describe('useSignupMutation', () => {
  beforeEach(async () => {
    useAuthStore.setState({ user: null });
    await setAccessToken(null);
    jest.restoreAllMocks();
  });

  it('on 201 Created — persists accessToken and sets user (auto-login)', async () => {
    const postSpy = jest
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce(successResponse);

    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({
        email: 'newworker@pinch.local',
        password: 'pinch1234!',
        name: '새워커',
        termsAgreed: true,
        marketingConsented: false,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postSpy).toHaveBeenCalledWith('/auth/signup', {
      email: 'newworker@pinch.local',
      password: 'pinch1234!',
      name: '새워커',
      termsAgreed: true,
      marketingConsented: false,
    });
    await expect(getAccessToken()).resolves.toBe('new.jwt.token');
    expect(useAuthStore.getState().user).toEqual({
      id: '201',
      email: 'newworker@pinch.local',
      name: '새워커',
      role: 'WORKER',
    });
  });

  it('on 409 EMAIL_TAKEN — does not auto-login, surfaces error', async () => {
    jest
      .spyOn(apiClient, 'post')
      .mockRejectedValueOnce(new Error('Request failed with status code 409'));

    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({
        email: 'worker001@pinch.local',
        password: 'pinch1234!',
        name: '워커001',
        termsAgreed: true,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/409/);
    await expect(getAccessToken()).resolves.toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('omits marketingConsented when not provided', async () => {
    const postSpy = jest
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce(successResponse);

    const { result } = renderHook(() => useSignupMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => {
      result.current.mutate({
        email: 'newworker@pinch.local',
        password: 'pinch1234!',
        name: '새워커',
        termsAgreed: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postSpy).toHaveBeenCalledWith('/auth/signup', {
      email: 'newworker@pinch.local',
      password: 'pinch1234!',
      name: '새워커',
      termsAgreed: true,
    });
  });
});
