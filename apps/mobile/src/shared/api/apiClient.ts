import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/shared/config/env';

const ACCESS_TOKEN_KEY = 'pinch.accessToken';

/**
 * SecureStore 접근자 — JWT 보관/회수.
 * 다음 브랜치(로그인 화면)에서 setAccessToken 호출.
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (token === null) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } else {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  }
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
  if (token) {
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
