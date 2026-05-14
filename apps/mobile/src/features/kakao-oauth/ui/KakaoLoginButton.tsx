import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session';
import { Button } from '@/shared/ui';
import { env } from '@/shared/config/env';
import { useKakaoOAuthMutation } from '../api/useKakaoOAuthMutation';
import {
  KAKAO_DISCOVERY,
  buildKakaoAuthRequestConfig,
  getKakaoRedirectUri,
} from '../lib/buildAuthRequest';

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

  const disabled = restApiKey.length === 0;

  return (
    <Button
      label="카카오톡으로 계속하기"
      variant="kakao"
      onPress={handlePress}
      disabled={disabled}
      loading={mutation.isPending}
    />
  );
}
