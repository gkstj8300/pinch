import { Stack } from 'expo-router';
import { colors } from '@pinch/ui-tokens';

export default function SignupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerTintColor: colors.text.primary,
        headerStyle: { backgroundColor: colors.background.primary },
        headerTitleStyle: { fontFamily: 'Pretendard-SemiBold' },
      }}
    >
      <Stack.Screen name="email" options={{ headerTitle: '이메일로 회원가입' }} />
    </Stack>
  );
}
