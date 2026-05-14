import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui';
import { queryKeys } from '@/shared/api';
import { brandAssets } from '@/shared/assets';
import { clearSession, useAuthStore } from '@/entities/user';

/**
 * 로그인 후 진입 화면 (계획서 §3.2.5).
 *   - 사용자 컨텍스트(name·email·role) 표시
 *   - 로그아웃: clearSession() + useMeQuery 캐시 무효화 + /login redirect
 *   - 보호: useAuthStore.user 가 null 이면 즉시 /login redirect
 */
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user]);

  if (user === null) return null;

  const handleLogout = async () => {
    await clearSession();
    queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
    router.replace('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background-primary">
      <View className="flex-1 gap-6 px-6 pt-6">
        <View>
          <Image
            source={brandAssets.logo}
            className="h-logo-sm w-logo-sm"
            resizeMode="contain"
            accessibilityLabel="PINCH"
          />
          <Text className="text-text-tertiary mt-1 text-sm">
            로그인 완료 — 다음 단계 화면들은 후속 PR
          </Text>
        </View>

        <View className="gap-1 rounded-2xl bg-background-secondary p-4">
          <Text className="text-text-secondary text-xs">계정</Text>
          <Text className="text-text-primary text-base font-pretendard-semibold">{user.name}</Text>
          <Text className="text-text-tertiary text-xs">{user.email}</Text>
          <Text className="text-text-quaternary text-xs">{user.role}</Text>
        </View>

        <View className="mt-auto pb-6">
          <Button label="로그아웃" variant="secondary" onPress={handleLogout} />
        </View>
      </View>
    </SafeAreaView>
  );
}
