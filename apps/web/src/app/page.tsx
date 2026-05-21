'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMeQuery, getAccessToken } from '@/entities/user';

/**
 * Splash / Redirect.
 *  - localStorage 토큰 없음 → 즉시 /login
 *  - 토큰 있음 → useMeQuery 발화 → settled 시 분기
 *    - 200 + role==='CLIENT' → /home
 *    - 200 + role!=='CLIENT' → /login (useMeQuery 외부에서 처리할 수도 있지만
 *      /home 안의 가드가 동일 처리 → 여기선 단순 /home 으로 보냄)
 *    - error → /login
 */
export default function SplashPage() {
  const router = useRouter();
  const hasToken = typeof window !== 'undefined' && getAccessToken() !== null;
  const { data, error, isLoading } = useMeQuery();

  useEffect(() => {
    if (!hasToken) {
      router.replace('/login');
      return;
    }
    if (error) {
      router.replace('/login');
      return;
    }
    if (data) {
      router.replace(data.role === 'CLIENT' ? '/home' : '/login');
    }
  }, [hasToken, data, error, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-bg-primary)">
      <div
        aria-label={isLoading ? '로딩 중' : '리다이렉트 중'}
        className="h-10 w-10 animate-spin rounded-full border-4 border-(--color-gray-20) border-t-(--color-identity)"
      />
    </main>
  );
}
