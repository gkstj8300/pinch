import { Stack } from 'expo-router';
import { colors } from '@pinch/ui-tokens';

export default function LoginLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerTintColor: colors.text.primary,
        headerStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: '', headerBackVisible: false }} />
      <Stack.Screen name="email" options={{ headerTitle: '이메일로 로그인' }} />
    </Stack>
  );
}
