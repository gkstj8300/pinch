import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/shared/config/env';

const ACCESS_TOKEN_KEY = 'pinch.accessToken';

/**
 * JWT 토큰 저장소 — 플랫폼별 분기.
 *   - native(iOS/Android): expo-secure-store (Keychain / EncryptedSharedPreferences)
 *   - web: localStorage (SecureStore 가 web 미완전 지원 — 계획서 §11 R3)
 *
 * web 의 localStorage 는 XSS 노출 가능 — dev 단계 한정.
 * production 에서는 HttpOnly cookie 또는 별도 web 토큰 전략 검토.
 */
async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

async function writeToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage === 'undefined') return;
    if (token === null) {
      globalThis.localStorage.removeItem(ACCESS_TOKEN_KEY);
    } else {
      globalThis.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
    return;
  }
  if (token === null) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } else {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return readToken();
}

export async function setAccessToken(token: string | null): Promise<void> {
  return writeToken(token);
}

/**
 * 공통 axios 인스턴스.
 *   - baseURL: env.API_BASE_URL
 *   - Bearer 토큰 자동 주입 (request interceptor)
 *   - 401 응답 시 토큰 무효화 + 후속 라우터 처리는 호출자가 결정
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await setAccessToken(null);
    }
    return Promise.reject(error);
  },
);
