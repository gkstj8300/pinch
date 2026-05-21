'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui';
import {
  clearSession,
  syncMeToStore,
  useAuthStore,
  useMeQuery,
} from '@/entities/user';

/**
 * 사업주 대시보드 (placeholder).
 *  - 토큰 무효/role 불일치 시 /login 으로
 *  - "내 공고" / "공고 등록" 진입 카드
 */
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useMeQuery();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (data) {
      if (data.role !== 'CLIENT') {
        void clearSession().then(() => router.replace('/login'));
        return;
      }
      syncMeToStore(data);
    }
  }, [data, router]);

  useEffect(() => {
    if (error) router.replace('/login');
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
        {isLoading ? (
          <p className="text-center text-(--color-text-secondary)">로딩 중...</p>
        ) : (
          <div className="grid grid-cols-1 gap-(--spacing-05) sm:grid-cols-2">
            <Link
              href="/jobs"
              className="flex flex-col gap-(--spacing-02) rounded-(--radius-04) bg-(--color-bg-primary) p-(--spacing-07) transition-colors hover:bg-(--color-bg-tertiary)"
            >
              <h2 className="text-lg font-bold text-(--color-text-primary)">내 공고</h2>
              <p className="text-sm text-(--color-text-secondary)">
                등록한 공고를 확인하고 진행 상황을 살펴보세요.
              </p>
            </Link>
            <Link
              href="/jobs/new"
              className="flex flex-col gap-(--spacing-02) rounded-(--radius-04) bg-(--color-bg-identity-sub) p-(--spacing-07) transition-colors hover:opacity-80"
            >
              <h2 className="text-lg font-bold text-(--color-text-identity-strong)">
                공고 등록
              </h2>
              <p className="text-sm text-(--color-text-identity-strong)">
                새 공고를 작성하고 워커를 매칭받아보세요.
              </p>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
