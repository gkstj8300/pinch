/**
 * jest setupFilesAfterEnv — 테스트 framework(expect) 가 로드된 뒤 실행.
 *  - @testing-library/jest-native 매처 확장 (toBeDisabled, toHaveTextContent 등)
 *  - native-only 모듈은 Expo Go 환경 없이 jest 에서 import 될 때 throw 하므로
 *    여기서 jest.mock 으로 안전한 더미를 주입한다.
 *  - 각 테스트 케이스가 일관된 상태로 시작하도록 fake 모듈은 모듈 레벨에서 mock.
 */

import '@testing-library/jest-native/extend-expect';

// ── expo-secure-store ─────────────────────────────────────────────────────
// 메모리 기반 stub. 토큰 read/write/delete 만 사용 → 단순 Map 으로 충분.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// ── expo-constants ────────────────────────────────────────────────────────
// KakaoLoginButton 이 ExecutionEnvironment.StoreClient 비교에 사용.
jest.mock('expo-constants', () => {
  const ExecutionEnvironment = {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  } as const;
  return {
    __esModule: true,
    default: { executionEnvironment: ExecutionEnvironment.StoreClient },
    ExecutionEnvironment,
  };
});

// ── expo-web-browser ─────────────────────────────────────────────────────
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'cancel' })),
}));

// ── expo-auth-session ─────────────────────────────────────────────────────
// useAuthRequest 는 [request, response, promptAsync] 튜플 반환.
jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [
    { url: 'https://kauth.kakao.com/oauth/authorize?stub' },
    null,
    jest.fn(async () => ({ type: 'cancel' })),
  ]),
  makeRedirectUri: jest.fn(() => 'pinch://oauth/kakao'),
  ResponseType: { Code: 'code' },
}));

// ── react-native-reanimated ───────────────────────────────────────────────
// reanimated 4 + worklets 가 jest 환경에서 native binding 요구 → 공식 mock 사용.
jest.mock('react-native-reanimated', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-reanimated/mock'),
);

// 전역 console.error 가 RN 환경 경고로 시끄러워지면 테스트 가독성 저하 →
// expected console output 검증이 있는 경우 각 테스트에서 spyOn 으로 처리.
