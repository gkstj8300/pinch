import '../../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { colors } from '@pinch/ui-tokens';
import { QueryProvider } from '@/app/_providers';

/**
 * Pretendard 4종 weight 로드 — 디자인 시스템 v0 §5 매핑:
 *   400 Regular / 500 Medium / 600 SemiBold / 700 Bold
 * 9종 weight 중 미사용 5종(Thin/ExtraLight/Light/ExtraBold/Black)은
 * assets/fonts 에 두되 미로드 — 번들 크기 절감.
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
      // 로드 실패해도 시스템 폰트로 fallback — 앱 자체는 동작 유지
      console.warn('[fonts] Pretendard load failed:', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && fontError === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background-primary">
        <ActivityIndicator size="large" color={colors.identity} />
      </View>
    );
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
