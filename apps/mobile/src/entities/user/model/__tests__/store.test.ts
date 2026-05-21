import { useAuthStore, clearSession } from '../store';
import { getAccessToken, setAccessToken } from '@/shared/api/apiClient';
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
  });

  it('removes both the SecureStore token and the zustand user', async () => {
    await clearSession();
    expect(useAuthStore.getState().user).toBeNull();
    await expect(getAccessToken()).resolves.toBeNull();
  });

  it('is idempotent — running twice does not throw', async () => {
    await clearSession();
    await expect(clearSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
