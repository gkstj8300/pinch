import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import {
  setAccessToken,
  setRefreshToken,
  useAuthStore,
  type UserRole,
} from '@/entities/user';

interface KakaoOAuthRequest {
  code: string;
  redirectUri: string;
}

interface KakaoOAuthResponse {
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

async function kakaoOAuthFn(req: KakaoOAuthRequest): Promise<KakaoOAuthResponse> {
  const { data } = await apiClient.post<KakaoOAuthResponse>('/auth/oauth/kakao', req);
  return data;
}

/**
 * 카카오 인가 코드 → 백엔드 토큰 교환 → PINCH access+refresh 발급.
 *   - 신규 사용자면 백엔드가 자동 가입 (oauth_provider='kakao')
 *   - 같은 이메일이 password 가입돼 있으면 409 EMAIL_TAKEN_BY_LOCAL
 *   - 카카오 측 오류는 502 KAKAO_API_ERROR
 */
export function useKakaoOAuthMutation() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<KakaoOAuthResponse, Error, KakaoOAuthRequest>({
    mutationFn: kakaoOAuthFn,
    onSuccess: async (data) => {
      await setAccessToken(data.accessToken);
      await setRefreshToken(data.refreshToken);
      const { id, email, name, role } = data.user;
      setUser({ id, email, name, role });
    },
  });
}
