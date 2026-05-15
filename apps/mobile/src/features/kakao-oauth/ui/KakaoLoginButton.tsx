import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SocialLoginButton } from '@/shared/ui';
import { env } from '@/shared/config/env';
import { useKakaoOAuthMutation } from '../api/useKakaoOAuthMutation';
import {
  KAKAO_DISCOVERY,
  buildKakaoAuthRequestConfig,
  getKakaoRedirectUri,
} from '../lib/buildAuthRequest';

/**
 * Expo Go 환경 여부 — Expo SDK 53+ 부터 auth.expo.io OAuth proxy 가
 * deprecated 되어 Expo Go 에서 `exp://<dev>:<port>/--/oauth/kakao` 같은
 * 동적 URI 가 발급됨. 카카오 콘솔은 http(s):// 만 등록 허용 → KOE006.
 *
 * 따라서 Expo Go 에서는 OAuth 흐름 진입 직전 "준비 중" Alert 로 종료.
 * EAS Dev Build / Standalone 빌드에서는 pinch://oauth/kakao 정상 동작.
 */
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Android Custom Tab / iOS SFSafariViewController 사전 워밍업 — 모듈
// 최상위에서 한 번만 호출되어야 한다 (Expo 권장 패턴).
WebBrowser.maybeCompleteAuthSession();

interface KakaoLoginButtonProps {
  onSuccess: () => void;
}

/**
 * 카카오 OAuth 진입 버튼.
 *   - 키 미설정(EXPO_PUBLIC_KAKAO_REST_API_KEY) 시 disabled + Alert
 *   - 인가 코드 수령 후 백엔드 /auth/oauth/kakao 로 교환 위임
 *   - 사용자가 카카오 동의 화면에서 취소 시 silent (Alert 미노출)
 */
export function KakaoLoginButton({ onSuccess }: KakaoLoginButtonProps) {
  const restApiKey = env.KAKAO_REST_API_KEY;
  const config = buildKakaoAuthRequestConfig(restApiKey);
  const [, response, promptAsync] = useAuthRequest(config, KAKAO_DISCOVERY);
  const mutation = useKakaoOAuthMutation();
  const consumedResponseRef = useRef<unknown>(null);

  useEffect(() => {
    if (response === null || response === undefined) return;
    if (consumedResponseRef.current === response) return;
    consumedResponseRef.current = response;

    if (response.type !== 'success') return;

    const code = response.params['code'];
    if (typeof code !== 'string' || code.length === 0) {
      Alert.alert('카카오 로그인 실패', '인가 코드를 받지 못했습니다');
      return;
    }
    mutation.mutate(
      { code, redirectUri: getKakaoRedirectUri() },
      { onSuccess },
    );
  }, [response, mutation, onSuccess]);

  const handlePress = async () => {
    if (IS_EXPO_GO) {
      Alert.alert(
        '준비 중',
        '카카오 로그인은 정식 빌드 환경에서 제공됩니다.\n(Expo Go 는 카카오 OAuth 미지원)',
      );
      return;
    }
    if (restApiKey.length === 0) {
      Alert.alert(
        '카카오 로그인 미설정',
        'EXPO_PUBLIC_KAKAO_REST_API_KEY 환경변수가 비어있습니다.',
      );
      return;
    }
    try {
      await promptAsync();
    } catch {
      Alert.alert('카카오 로그인 오류', '잠시 후 다시 시도해주세요');
    }
  };

  return (
    <SocialLoginButton
      provider="kakao"
      onPress={handlePress}
      loading={mutation.isPending}
    />
  );
}
