import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { colors } from '@pinch/ui-tokens';

/**
 * 베이스라인 placeholder 화면.
 * 다음 브랜치(E.2)에서 로그인 화면으로 교체됨.
 *
 * 검증 포인트:
 *   - NativeWind 클래스 (bg-background-primary, text-text-* 등) 정상 적용
 *   - @pinch/ui-tokens 워크스페이스 패키지 import 동작
 *   - SafeAreaView · GestureHandlerRootView · QueryProvider 래핑 정상
 */
export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-primary">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-identity text-5xl font-bold">PINCH</Text>
        <Text className="text-text-tertiary mt-3 text-center">
          필요한 순간, 한 꼬집의 시간을 채우다
        </Text>

        <View className="mt-12 w-full rounded-2xl bg-background-secondary p-4">
          <Text className="text-text-secondary text-sm">
            디자인 시스템 v0 baseline
          </Text>
          <Text className="text-text-identity-strong mt-1 text-base font-semibold">
            identity color = {colors.identity}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
