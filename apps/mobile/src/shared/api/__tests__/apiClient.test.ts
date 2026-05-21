/**
 * apiClient 401 자동 재시도 / 동시 직렬화 / refresh 실패 시 토큰 무효화.
 *
 * 전략
 *   - apiClient 의 adapter 를 jest.fn 으로 교체 → 응답 시퀀스 직접 주입
 *   - 401 은 adapter 에서 직접 AxiosError 를 throw — axios.dispatchRequest 가
 *     이를 그대로 catch 흐름으로 전파
 *   - /auth/refresh 는 별도 axios.post(default) 로 호출 → axios.post 만 spyOn
 *   - interceptor 의 `apiClient.request(original)` 재시도는 adapter 의 2번째
 *     호출로 검증
 */
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
  const err = new axios.AxiosError(
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
  throw err;
}

describe('apiClient — 401 interceptor + refresh rotation', () => {
  const originalAdapter = apiClient.defaults.adapter;
  let adapter: jest.Mock;

  beforeEach(async () => {
    await setAccessToken('expired.access.token');
    await setRefreshToken('valid.refresh.token');

    adapter = jest.fn();
    apiClient.defaults.adapter = adapter;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('401 받으면 /auth/refresh 호출 → 새 access 로 원 요청 재시도', async () => {
    adapter
      .mockImplementationOnce(throw401)
      .mockImplementationOnce(async () => ok({ items: [1, 2, 3] }));

    const refreshSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { accessToken: 'new.access', refreshToken: 'new.refresh' },
    } as never);

    const response = await apiClient.get('/jobs/search');

    expect(response.data).toEqual({ items: [1, 2, 3] });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy.mock.calls[0]?.[0]).toMatch(/\/auth\/refresh$/);
    expect((refreshSpy.mock.calls[0]?.[1] as { refreshToken: string })?.refreshToken).toBe(
      'valid.refresh.token',
    );

    await expect(getAccessToken()).resolves.toBe('new.access');
    await expect(getRefreshToken()).resolves.toBe('new.refresh');

    expect(adapter).toHaveBeenCalledTimes(2);
    const secondConfig = adapter.mock.calls[1]?.[0] as { headers: { Authorization?: string } };
    expect(secondConfig.headers.Authorization).toBe('Bearer new.access');
  });

  it('refresh 실패 시 양 토큰 무효화 + 호출자에게 401 에러 전파', async () => {
    adapter.mockImplementationOnce(throw401);
    jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh failed'));

    await expect(apiClient.get('/jobs/search')).rejects.toMatchObject({
      response: { status: 401 },
    });

    await expect(getAccessToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('refresh token 이 없으면 재시도 안 함, 토큰 무효화만', async () => {
    await setRefreshToken(null);

    adapter.mockImplementationOnce(throw401);
    const refreshSpy = jest.spyOn(axios, 'post');

    await expect(apiClient.get('/jobs/search')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshSpy).not.toHaveBeenCalled();
    await expect(getAccessToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('동시 5개 요청이 모두 401 받아도 /auth/refresh 는 1회만 호출', async () => {
    adapter.mockImplementation(async (config: InternalAxiosRequestConfig) => {
      const auth = (config.headers as { Authorization?: string }).Authorization;
      if (auth === 'Bearer expired.access.token') {
        throw401(config);
      }
      return ok({ ok: true });
    });

    const refreshSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { accessToken: 'rotated.access', refreshToken: 'rotated.refresh' },
    } as never);

    const responses = await Promise.all([
      apiClient.get('/r1'),
      apiClient.get('/r2'),
      apiClient.get('/r3'),
      apiClient.get('/r4'),
      apiClient.get('/r5'),
    ]);

    expect(responses).toHaveLength(5);
    responses.forEach((r) => expect(r.data).toEqual({ ok: true }));
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('/auth/logout 의 401 은 재시도 가드 — 무한 루프 방지', async () => {
    adapter.mockImplementationOnce(throw401);
    const refreshSpy = jest.spyOn(axios, 'post');

    await expect(
      apiClient.post('/auth/logout', { refreshToken: 'x' }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
