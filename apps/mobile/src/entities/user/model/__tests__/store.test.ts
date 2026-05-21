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
  email: 'worker001@pinch.local',
  name: '워커001',
  role: 'WORKER',
};

describe('useAuthStore', () => {
  beforeEach(async () => {
    useAuthStore.setState({ user: null });
    await setAccessToken(null);
  });

  it('starts with a null user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setUser stores the user in memory cache', () => {
    useAuthStore.getState().setUser(sampleUser);
    expect(useAuthStore.getState().user).toEqual(sampleUser);
  });

  it('clearUser resets to null', () => {
    useAuthStore.setState({ user: sampleUser });
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('replacing user with setUser overwrites previous value', () => {
    useAuthStore.getState().setUser(sampleUser);
    const otherUser: AuthUser = { ...sampleUser, id: '99', name: '워커099' };
    useAuthStore.getState().setUser(otherUser);
    expect(useAuthStore.getState().user).toEqual(otherUser);
  });
});

describe('clearSession', () => {
  beforeEach(async () => {
    useAuthStore.setState({ user: sampleUser });
    await setAccessToken('stale-jwt-token');
    await setRefreshToken('stale-refresh-token');
    jest.restoreAllMocks();
  });

  it('refresh 가 있으면 /auth/logout 호출 + 양 토큰 + user 모두 무효화', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: '' } as never);

    await clearSession();

    expect(postSpy).toHaveBeenCalledWith('/auth/logout', {
      refreshToken: 'stale-refresh-token',
    });
    expect(useAuthStore.getState().user).toBeNull();
    await expect(getAccessToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('refresh 가 없으면 /auth/logout 호출 안 함, 로컬만 무효화', async () => {
    await setRefreshToken(null);
    const postSpy = jest.spyOn(apiClient, 'post');

    await clearSession();

    expect(postSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    await expect(getAccessToken()).resolves.toBeNull();
  });

  it('/auth/logout 네트워크 실패에도 로컬 무효화는 끝까지 수행 (best-effort)', async () => {
    jest.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network Error'));

    await expect(clearSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().user).toBeNull();
    await expect(getAccessToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('is idempotent — running twice does not throw', async () => {
    jest.spyOn(apiClient, 'post').mockResolvedValue({ data: '' } as never);
    await clearSession();
    await expect(clearSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
