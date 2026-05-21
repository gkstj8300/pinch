import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/shared/config/env';

const ACCESS_TOKEN_KEY = 'pinch.accessToken';
const REFRESH_TOKEN_KEY = 'pinch.refreshToken';

/**
 * JWT 토큰 저장소 — web 전용. localStorage 사용.
 *
 *  - SSR/RSC 환경 (`typeof window === 'undefined'`) 에서는 null 반환 / 무시
 *  - localStorage 는 XSS 노출 가능 — 1차 dev 한정. 운영 진입 전 HttpOnly cookie
 *    전환 (plan 03 §2.5 W6 참조)
 */
function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

function write(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
}

export function getAccessToken(): string | null {
  return read(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  write(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return read(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  write(REFRESH_TOKEN_KEY, token);
}

/**
 * 공통 axios 인스턴스 — `apps/mobile` 와 동일 패턴.
 *  - Bearer 자동 주입 (request interceptor)
 *  - 401 1회 자동 refresh + 원 요청 재시도
 *  - 동시 401 직렬화 (refreshPromise 공유)
 */
export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token !== null) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) {
    setAccessToken(null);
    return null;
  }

  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${env.API_BASE_URL}/auth/refresh`,
      { refreshToken: refresh },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 },
    );
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }
}

function isAuthBypassed(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/auth/refresh') || url.includes('/auth/logout');
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retried || isAuthBypassed(original.url)) {
      return Promise.reject(error);
    }

    original._retried = true;

    refreshPromise ??= performRefresh();
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (!newToken) {
      return Promise.reject(error);
    }

    original.headers.set('Authorization', `Bearer ${newToken}`);
    return apiClient.request(original);
  },
);
