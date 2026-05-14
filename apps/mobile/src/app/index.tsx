import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@pinch/ui-tokens';
import { getAccessToken, useAuthStore, useMeQuery } from '@/entities/user';

/**
 * Splash / Redirect (계획서 §3.2.1).
 *
 * 흐름:
 *   1) SecureStore 토큰 확인 → hasToken state 설정
 *   2-a) 토큰 없음 → /login replace
 *   2-b) 토큰 있음 → useMeQuery 발화
 *        ├─ success → useAuthStore.setUser + /home replace
 *        └─ error(401 / 네트워크) → apiClient interceptor 가 토큰 자동 무효화
 *                                  → /login replace
 */
export default function SplashScreen() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!cancelled) setHasToken(token !== null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const meQuery = useMeQuery({ enabled: hasToken === true });

  useEffect(() => {
    if (hasToken === null) return;
    if (hasToken === false) {
      router.replace('/login');
      return;
    }
    if (meQuery.isSuccess) {
      setUser(meQuery.data);
      router.replace('/home');
    } else if (meQuery.isError) {
      router.replace('/login');
    }
  }, [hasToken, meQuery.isSuccess, meQuery.isError, meQuery.data, setUser]);

  return (
    <View className="flex-1 items-center justify-center bg-background-primary">
      <ActivityIndicator size="large" color={colors.identity} />
    </View>
  );
}
