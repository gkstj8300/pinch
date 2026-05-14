import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { KakaoLoginButton } from '@/features/kakao-oauth';

/**
 * 메인 로그인 (계획서 §3.2.2).
 *   - 1순위 CTA: 카카오톡 (실동작, KakaoLoginButton)
 *   - 2순위: Apple — disabled, 클릭 시 "준비 중" Alert
 *   - 보조 소셜: 네이버 / 페이스북 (원형 배지) — 동일
 *   - 텍스트 링크: 이메일 로그인 / 회원가입
 */
export default function LoginIndexScreen() {
  const handleLoginSuccess = () => {
    router.replace('/home');
  };
  const notImpl = (name: string) =>
    Alert.alert('준비 중', `${name} 로그인은 곧 제공됩니다`);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['bottom']}>
      <View className="flex-1 gap-6 px-6">
        <View className="mt-16 items-center">
          <Text className="text-identity text-4xl font-bold">PINCH</Text>
          <Text className="text-text-tertiary mt-2 text-sm">
            필요한 순간, 한 꼬집의 시간을 채우다
          </Text>
        </View>

        <View className="bg-identity-sub mt-8 self-center rounded-full px-4 py-2">
          <Text className="text-text-identity-strong text-sm font-semibold">
            🎉 3초만에 빠른 회원가입
          </Text>
        </View>

        <View className="gap-3">
          <KakaoLoginButton onSuccess={handleLoginSuccess} />

          <Pressable
            onPress={() => notImpl('Apple')}
            accessibilityRole="button"
            className="h-12 items-center justify-center rounded-xl bg-gray-90"
          >
            <Text className="text-text-primary-inverse text-base font-semibold">
              Apple로 계속하기
            </Text>
          </Pressable>

          <View className="mt-2 flex-row justify-center gap-4">
            <Pressable
              onPress={() => notImpl('네이버')}
              accessibilityRole="button"
              accessibilityLabel="네이버로 로그인"
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: '#03C75A' }}
            >
              <Text className="text-text-primary-inverse text-base font-bold">N</Text>
            </Pressable>
            <Pressable
              onPress={() => notImpl('페이스북')}
              accessibilityRole="button"
              accessibilityLabel="페이스북으로 로그인"
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: '#1877F2' }}
            >
              <Text className="text-text-primary-inverse text-base font-bold">f</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-auto items-center gap-3 pb-8">
          <View className="flex-row items-center gap-3">
            <Link href="/login/email" className="text-text-secondary text-sm">
              이메일로 로그인
            </Link>
            <Text className="text-text-quaternary">|</Text>
            <Link href="/signup/email" className="text-text-secondary text-sm">
              이메일로 회원가입
            </Link>
          </View>
          <Text className="text-text-tertiary text-xs">로그인에 문제가 있으신가요?</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
