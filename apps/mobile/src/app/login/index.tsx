import { Alert, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { KakaoLoginButton } from '@/features/kakao-oauth';
import { SocialLoginButton } from '@/shared/ui';
import { brandAssets } from '@/shared/assets';

/**
 * 메인 로그인 화면.
 *
 * Layout:
 *   상단 spacer (flex-1) — 로고 그룹을 화면 중앙쯤에 띄움
 *   로고 + 식별 텍스트 (vertical center 영역)
 *   하단 spacer (flex-1)
 *   강조 말풍선
 *   소셜 로그인 3종 (카카오 실동작 / 네이버·구글 placeholder)
 *   하단 링크 (이메일 로그인 / 회원가입 / 로그인 문제)
 */
export default function LoginIndexScreen() {
  const handleLoginSuccess = () => {
    router.replace('/home');
  };
  const notImpl = (name: string) =>
    Alert.alert('준비 중', `${name} 로그인은 곧 제공됩니다`);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-1 px-6">
        {/* 로고 + 말풍선 + 소셜 버튼을 한 묶음으로 화면 중앙에 배치 */}
        <View className="flex-1 justify-center gap-6">
          <View className="items-center">
            <Image
              source={brandAssets.logo}
              style={{ width: 210, height: 65 }}
              resizeMode="contain"
              accessibilityLabel="PINCH"
            />
            <Text className="text-text-tertiary mt-2 text-sm">
              필요한 순간, 한 꼬집의 시간을 채우다
            </Text>
          </View>

          <View className="bg-identity-sub self-center rounded-full px-4 py-2">
            <Text className="text-text-identity-strong text-sm font-pretendard-semibold">
              🎉 3초만에 빠른 회원가입
            </Text>
          </View>

          <View className="gap-3">
            <KakaoLoginButton onSuccess={handleLoginSuccess} />
            <SocialLoginButton provider="naver" onPress={() => notImpl('네이버')} />
            <SocialLoginButton provider="google" onPress={() => notImpl('Google')} />
          </View>
        </View>

        {/* 하단 텍스트 링크 — bottom 고정 */}
        <View className="items-center gap-3 pb-2">
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
