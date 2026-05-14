import {
  ResponseType,
  makeRedirectUri,
  type AuthRequestConfig,
  type DiscoveryDocument,
} from 'expo-auth-session';

/**
 * 카카오 OAuth 엔드포인트 — 토큰 교환은 백엔드(/auth/oauth/kakao)에서
 * 별도로 수행하므로 모바일은 authorizationEndpoint 만 실제 사용.
 */
export const KAKAO_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

/**
 * Redirect URI 빌더 — Expo Go(개발) 에서는 https://auth.expo.io/@user/slug,
 * Standalone(EAS) 에서는 pinch://oauth/kakao 자동 분기.
 *
 * 카카오 디벨로퍼 콘솔 → Redirect URI 화이트리스트에 동일 값 등록 필수.
 */
export function getKakaoRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'pinch',
    path: 'oauth/kakao',
  });
}

/**
 * useAuthRequest 에 그대로 넘길 수 있는 config 빌더.
 * usePKCE=false — 카카오는 PKCE 미지원 (2026 기준).
 */
export function buildKakaoAuthRequestConfig(restApiKey: string): AuthRequestConfig {
  return {
    clientId: restApiKey,
    responseType: ResponseType.Code,
    redirectUri: getKakaoRedirectUri(),
    scopes: [],
    usePKCE: false,
  };
}
