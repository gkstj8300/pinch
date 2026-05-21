/**
 * KakaoLoginButton — Expo Go 가드 동작 검증.
 *
 * jest.setup.ts 에서 expo-constants 의 executionEnvironment 를 StoreClient
 * (= Expo Go) 로 mock 했으므로, 본 테스트의 기본 환경은 IS_EXPO_GO=true.
 * 따라서 버튼 누름 → "준비 중" Alert + promptAsync 호출 안 됨이 기대 동작.
 *
 * 실 디바이스 / EAS 빌드(IS_EXPO_GO=false) 시나리오는 별도 통합 테스트로
 * 분리하는 것이 깔끔 — 본 단위 테스트는 가드 로직 보호가 목적.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KakaoLoginButton } from '../KakaoLoginButton';
import * as ExpoAuthSession from 'expo-auth-session';

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('KakaoLoginButton (Expo Go 환경)', () => {
  let alertSpy: jest.SpyInstance;
  let promptAsyncMock: jest.Mock;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // useAuthRequest 반환 튜플의 promptAsync(3번째 요소) 를 추적.
    promptAsyncMock = jest.fn(async () => ({ type: 'cancel' as const }));
    (ExpoAuthSession.useAuthRequest as jest.Mock).mockReturnValue([
      { url: 'https://kauth.kakao.com/oauth/authorize?stub' },
      null,
      promptAsyncMock,
    ]);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders the kakao social button', () => {
    const { getByLabelText } = render(
      <KakaoLoginButton onSuccess={jest.fn()} />,
      { wrapper: Wrapper },
    );
    expect(getByLabelText('카카오로 시작하기')).toBeTruthy();
  });

  it('press in Expo Go shows "준비 중" Alert and does NOT call promptAsync', () => {
    const { getByLabelText } = render(
      <KakaoLoginButton onSuccess={jest.fn()} />,
      { wrapper: Wrapper },
    );

    fireEvent.press(getByLabelText('카카오로 시작하기'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[0]).toBe('준비 중');
    expect(alertSpy.mock.calls[0]?.[1]).toMatch(/Expo Go/);
    expect(promptAsyncMock).not.toHaveBeenCalled();
  });

  it('does not call onSuccess when the press is blocked by the Expo Go guard', () => {
    const onSuccess = jest.fn();
    const { getByLabelText } = render(
      <KakaoLoginButton onSuccess={onSuccess} />,
      { wrapper: Wrapper },
    );

    fireEvent.press(getByLabelText('카카오로 시작하기'));

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
