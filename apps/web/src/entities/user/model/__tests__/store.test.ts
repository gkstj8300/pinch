import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, clearSession } from '../store';
import {
  apiClient,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/shared/api/apiClient';
import type { AuthUser } from '../types';

const sampleUser: AuthUser = {
  id: '42',
  email: 'client@pinch.local',
  role: 'CLIENT',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    setAccessToken(null);
    setRefreshToken(null);
    vi.restoreAllMocks();
  });

  it('starts with null user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setUser / clearUser', () => {
    useAuthStore.getState().setUser(sampleUser);
    expect(useAuthStore.getState().user).toEqual(sampleUser);
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('clearSession', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: sampleUser });
    setAccessToken('stale.access');
    setRefreshToken('stale.refresh');
    vi.restoreAllMocks();
  });

  it('refresh 있으면 /auth/logout 호출 + 모든 토큰 + user 무효화', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: '' });
    await clearSession();
    expect(postSpy).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: 'stale.refresh',
    });
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('refresh 없으면 /auth/logout 호출 안 함, 로컬만 무효화', async () => {
    setRefreshToken(null);
    const postSpy = vi.spyOn(apiClient, 'post');
    await clearSession();
    expect(postSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('네트워크 실패에도 로컬 무효화는 끝까지 수행', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network Error'));
    await expect(clearSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
