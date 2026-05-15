import { Stack } from 'expo-router';
import { colors } from '@pinch/ui-tokens';
import { BackArrow } from '@/shared/ui';

export default function LoginLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="email"
        options={{
          headerTitle: '이메일로 로그인',
          headerLeft: () => <BackArrow />,
        }}
      />
    </Stack>
  );
}
