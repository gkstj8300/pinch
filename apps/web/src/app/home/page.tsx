'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui';
import {
  clearSession,
  syncMeToStore,
  useAuthStore,
  useMeQuery,
} from '@/entities/user';

/**
 * 빈 대시보드 — 1차 부트스트랩.
 *  - 토큰 무효 시 useMeQuery 가 401 → apiClient 자동 refresh → 실패 시 /login 으로
 *  - 사용자 정보 표시 + 로그아웃 버튼
 *  - 사업주(CLIENT) 가 아닌 사용자가 우회 진입한 경우도 /login 으로 리다이렉트
 */
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useMeQuery();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (data) {
      if (data.role !== 'CLIENT') {
        // 사업주 도메인에 워커/관리자 우회 진입 — 강제 로그아웃
        void clearSession().then(() => router.replace('/login'));
        return;
      }
      syncMeToStore(data);
    }
  }, [data, router]);

  useEffect(() => {
    if (error) {
      // /auth/me 가 401 → apiClient interceptor 가 refresh 후 재시도 후에도 실패
      router.replace('/login');
    }
  }, [error, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await clearSession();
    router.replace('/login');
  };

  const currentUser = user ?? data ?? null;

  return (
    <main className="min-h-screen bg-(--color-bg-secondary)">
      <header className="flex items-center justify-between bg-(--color-bg-primary) px-(--spacing-06) py-(--spacing-04) shadow-sm">
        <h1 className="text-xl font-bold text-(--color-identity)">PINCH for Business</h1>
        <div className="flex items-center gap-(--spacing-04)">
          {currentUser !== null && (
            <span className="text-sm text-(--color-text-secondary)">
              {currentUser.email}
            </span>
          )}
          <Button
            variant="secondary"
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-10 px-(--spacing-04) text-sm"
          >
            {loggingOut ? '로그아웃 중...' : '로그아웃'}
          </Button>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-(--spacing-04) py-(--spacing-09)">
        <div className="rounded-(--radius-04) bg-(--color-bg-primary) p-(--spacing-07) text-center">
          {isLoading ? (
            <p className="text-(--color-text-secondary)">로딩 중...</p>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-(--color-text-primary)">
                환영합니다{currentUser !== null ? `, ${currentUser.email}` : ''}!
              </h2>
              <p className="mt-(--spacing-03) text-(--color-text-secondary)">
                공고 등록·관리, 출퇴근 모니터링, 정산 기능은 다음 업데이트에서 제공됩니다.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
