import { Stack } from 'expo-router';
import { colors } from '@pinch/ui-tokens';
import { BackArrow } from '@/shared/ui';

/**
 * /signup 그룹은 /login 과 별도 Stack — /signup/email 진입 시 stack
 * 첫 화면이라 자동 백 버튼이 안 나옴. BackArrow 의 fallbackHref 로 처리.
 */
export default function SignupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.text.primary,
        headerStyle: { backgroundColor: colors.background.primary },
        headerTitleStyle: { fontFamily: 'Pretendard-SemiBold' },
      }}
    >
      <Stack.Screen
        name="email"
        options={{
          headerTitle: '이메일로 회원가입',
          headerLeft: () => <BackArrow fallbackHref="/login" />,
        }}
      />
    </Stack>
  );
}
