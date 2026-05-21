/**
 * apiClient 401 자동 재시도 / 동시 직렬화 / refresh 실패 시 토큰 무효화.
 * 모바일 apiClient.test.ts 와 동일 패턴 (vitest).
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  apiClient,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../apiClient';

function ok(data: unknown = {}) {
  return { status: 200, data, headers: {}, statusText: 'OK', config: {} };
}

function throw401(config: InternalAxiosRequestConfig): never {
  throw new axios.AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    {
      status: 401,
      statusText: 'Unauthorized',
      data: { error: 'UNAUTHENTICATED' },
      headers: {},
      config,
    },
  );
}

describe('apiClient — 401 interceptor + refresh rotation', () => {
  const originalAdapter = apiClient.defaults.adapter;
  let adapter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('expired.access');
    setRefreshToken('valid.refresh');
    adapter = vi.fn();
    apiClient.defaults.adapter = adapter;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('401 받으면 /auth/refresh 후 새 access 로 재시도', async () => {
    adapter
      .mockImplementationOnce(throw401)
      .mockImplementationOnce(async () => ok({ items: [1, 2] }));

    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { accessToken: 'new.access', refreshToken: 'new.refresh' },
    });

    const response = await apiClient.get('/jobs');

    expect(response.data).toEqual({ items: [1, 2] });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('new.access');
    expect(getRefreshToken()).toBe('new.refresh');
  });

  it('refresh 실패 시 양 토큰 무효화 + 401 전파', async () => {
    adapter.mockImplementationOnce(throw401);
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh failed'));

    await expect(apiClient.get('/jobs')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('refresh 없으면 재시도 안 함, 토큰 무효화만', async () => {
    setRefreshToken(null);
    adapter.mockImplementationOnce(throw401);
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(apiClient.get('/jobs')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('동시 5개 401 → /auth/refresh 1회만', async () => {
    adapter.mockImplementation(async (config: InternalAxiosRequestConfig) => {
      const auth = (config.headers as { Authorization?: string }).Authorization;
      if (auth === 'Bearer expired.access') {
        throw401(config);
      }
      return ok({ ok: true });
    });

    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { accessToken: 'rotated.access', refreshToken: 'rotated.refresh' },
    });

    const responses = await Promise.all([
      apiClient.get('/a'),
      apiClient.get('/b'),
      apiClient.get('/c'),
      apiClient.get('/d'),
      apiClient.get('/e'),
    ]);
    expect(responses).toHaveLength(5);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('/auth/logout 401 은 재시도 가드', async () => {
    adapter.mockImplementationOnce(throw401);
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(apiClient.post('/auth/logout', {})).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
