import '../../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryProvider } from '@/app/_providers';

// 모듈 로드 시점에 splash 자동 hide 차단 — 폰트 로딩 완료 후 수동 hide.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* 일부 web 환경에서 미지원 — 무시 */
});

/**
 * 루트 레이아웃.
 *   - expo-splash-screen plugin (app.json) 이 native splash (logo.png) 를
 *     앱 시작 시 즉시 노출. 폰트 로드 완료 후 hideAsync 로 페이드아웃.
 *   - Pretendard 4종 weight (디자인 시스템 v0 §5)
 *   - 폰트 로드 실패 시 console.warn 후 시스템 폰트로 fallback (앱 동작 유지)
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    if (fontError !== null) {
      console.warn('[fonts] Pretendard load failed:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError !== null) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && fontError === null) {
    // native splash 가 계속 보이는 상태 — 별도 UI 렌더링 불필요
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
