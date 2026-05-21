import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import {
  setAccessToken,
  setRefreshToken,
  useAuthStore,
  type UserRole,
} from '@/entities/user';

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  termsAgreed: boolean;
  marketingConsented?: boolean;
}

interface SignupResponse {
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

async function signupFn(req: SignupRequest): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/auth/signup', req);
  return data;
}

/**
 * 이메일/비밀번호 회원가입 — 성공 시 자동 로그인 (백엔드가 동일 응답 형태로
 * access+refresh+user 를 반환). 클라이언트는 토큰·user 저장만 수행.
 */
export function useSignupMutation() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<SignupResponse, Error, SignupRequest>({
    mutationFn: signupFn,
    onSuccess: async (data) => {
      await setAccessToken(data.accessToken);
      await setRefreshToken(data.refreshToken);
      const { id, email, name, role } = data.user;
      setUser({ id, email, name, role });
    },
  });
}
