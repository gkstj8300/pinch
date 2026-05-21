import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/shared/config/env';

const ACCESS_TOKEN_KEY = 'pinch.accessToken';
const REFRESH_TOKEN_KEY = 'pinch.refreshToken';

/**
 * JWT 토큰 저장소 — 플랫폼별 분기.
 *   - native(iOS/Android): expo-secure-store (Keychain / EncryptedSharedPreferences)
 *   - web: localStorage (SecureStore 가 web 미완전 지원 — plan 01 §11 R3)
 *
 * web 의 localStorage 는 XSS 노출 가능 — dev 단계 한정.
 * production 에서는 HttpOnly cookie 또는 별도 web 토큰 전략 검토.
 */
async function readToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function writeToken(key: string, token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage === 'undefined') return;
    if (token === null) {
      globalThis.localStorage.removeItem(key);
    } else {
      globalThis.localStorage.setItem(key, token);
    }
    return;
  }
  if (token === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, token);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return readToken(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  return writeToken(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return readToken(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  return writeToken(REFRESH_TOKEN_KEY, token);
}

/**
 * 공통 axios 인스턴스.
 *   - baseURL: env.API_BASE_URL
 *   - Bearer 토큰 자동 주입 (request interceptor)
 *   - 401 응답 시 1회 자동 refresh 시도 → 새 access 로 원 요청 재시도
 *   - refresh 실패 시 양 토큰 무효화 + 호출자에게 에러 전파
 */
export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token !== null) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * 동시 401 직렬화 — N 개 요청이 동시에 401 을 받아도 /auth/refresh 는 1회만.
 * `refreshPromise` 가 살아있으면 후속 호출자는 동일 promise 를 await.
 */
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    // refresh 가 없는 상태에서 access 가 401 을 받았다면 access 도 무효
    await setAccessToken(null);
    return null;
  }

  try {
    // apiClient 자기 자신을 쓰지 않기 위해 axios 직접 호출 — 무한 401 루프 방지
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${env.API_BASE_URL}/auth/refresh`,
      { refreshToken: refresh },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 },
    );
    await setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    await setAccessToken(null);
    await setRefreshToken(null);
    return null;
  }
}

/**
 * 재시도 대상 가드 — refresh/logout 자체의 401 은 재시도하면 무한 루프.
 */
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
      // refresh 실패 — 양 토큰 이미 무효화됨 (performRefresh 안에서)
      return Promise.reject(error);
    }

    original.headers.set('Authorization', `Bearer ${newToken}`);
    return apiClient.request(original);
  },
);
