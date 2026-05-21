import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import {
  clearSession,
  setAccessToken,
  setRefreshToken,
  useAuthStore,
  type UserRole,
} from '@/entities/user';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
  };
}

/**
 * 사업주 전용 에러 — role !== 'CLIENT' 인 사용자가 사업주 도메인에 진입 시도.
 * useLoginMutation 의 onSuccess 안에서 throw → mutation.isError 로 분기.
 */
export class NotClientError extends Error {
  constructor() {
    super('NOT_CLIENT');
    this.name = 'NotClientError';
  }
}

async function loginFn(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', req);
  return data;
}

/**
 * 사업주 이메일 로그인.
 *   - 성공 응답 후 role 검증: CLIENT 가 아니면 토큰 무효화 후 NotClientError.
 *   - 정상 CLIENT 면 localStorage 양 토큰 + Zustand user 저장.
 */
export function useLoginMutation() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: loginFn,
    onSuccess: async (data) => {
      if (data.user.role !== 'CLIENT') {
        // 워커/관리자 계정으로 사업주 로그인 시도 — 토큰 미저장, 세션 정리, 에러
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        await clearSession();
        throw new NotClientError();
      }
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      const { id, email, role } = data.user;
      setUser({ id, email, role });
    },
  });
}
