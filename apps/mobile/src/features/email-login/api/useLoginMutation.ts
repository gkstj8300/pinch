import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import {
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

async function loginFn(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', req);
  return data;
}

/**
 * 이메일/비밀번호 로그인.
 *   - 성공 시 SecureStore 에 access+refresh 한 쌍 저장 + Zustand user 갱신
 *   - 실패는 caller 가 mutation.error 로 분기 (LoginForm 에서 apiError 메시지화)
 */
export function useLoginMutation() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: loginFn,
    onSuccess: async (data) => {
      await setAccessToken(data.accessToken);
      await setRefreshToken(data.refreshToken);
      const { id, email, name, role } = data.user;
      setUser({ id, email, name, role });
    },
  });
}
