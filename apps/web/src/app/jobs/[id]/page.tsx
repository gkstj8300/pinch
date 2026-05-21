'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJobDetailQuery, formatJobTime } from '@/entities/job';
import { useAuthStore } from '@/entities/user';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 공고 상세.
 *   - 본인 공고만 표시 (UX 가드 — 백엔드는 누구나 조회 허용)
 *   - 데이터 fetched 후 client.id 불일치면 /jobs 로 리다이렉트
 */
export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useJobDetailQuery(id);

  useEffect(() => {
    if (data && currentUser && data.client && data.client.id !== currentUser.id) {
      router.replace('/jobs');
    }
  }, [data, currentUser, router]);

  return (
    <main className="min-h-screen bg-(--color-bg-secondary)">
      <header className="flex items-center gap-(--spacing-04) bg-(--color-bg-primary) px-(--spacing-06) py-(--spacing-04) shadow-sm">
        <Link
          href="/jobs"
          className="text-sm text-(--color-text-secondary) hover:text-(--color-identity)"
        >
          ← 목록으로
        </Link>
        <h1 className="truncate text-xl font-bold text-(--color-text-primary)">
          {data?.title ?? '공고 상세'}
        </h1>
      </header>

      <section className="mx-auto max-w-2xl px-(--spacing-04) py-(--spacing-07)">
        {isLoading && (
          <p className="text-center text-(--color-text-secondary)">불러오는 중...</p>
        )}
        {error && (
          <p className="text-center text-(--color-error)">
            공고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        )}
        {data && (
          <article className="flex flex-col gap-(--spacing-05) rounded-(--radius-04) bg-(--color-bg-primary) p-(--spacing-07)">
            <div>
              <p className="text-xs text-(--color-text-tertiary)">{data.category}</p>
              <h2 className="mt-(--spacing-01) text-2xl font-bold text-(--color-text-primary)">
                {data.title}
              </h2>
            </div>
            <p className="whitespace-pre-wrap text-sm text-(--color-text-secondary)">
              {data.description}
            </p>
            <dl className="grid grid-cols-2 gap-(--spacing-04) text-sm">
              <div>
                <dt className="text-(--color-text-tertiary)">근무 시간</dt>
                <dd className="text-(--color-text-primary)">
                  {formatJobTime(data.startAt, data.endAt)}
                </dd>
              </div>
              <div>
                <dt className="text-(--color-text-tertiary)">예상 근무 분</dt>
                <dd className="text-(--color-text-primary)">{data.estimatedMinutes}분</dd>
              </div>
              <div>
                <dt className="text-(--color-text-tertiary)">시급</dt>
                <dd className="text-(--color-text-primary)">
                  {data.hourlyWage.toLocaleString()}원
                </dd>
              </div>
              <div>
                <dt className="text-(--color-text-tertiary)">예상 지급액</dt>
                <dd className="text-(--color-text-primary)">
                  {data.estimatedPay.toLocaleString()}원
                </dd>
              </div>
              <div>
                <dt className="text-(--color-text-tertiary)">모집</dt>
                <dd className="text-(--color-text-primary)">
                  {data.confirmedCount}/{data.recruitCount}명
                </dd>
              </div>
              <div>
                <dt className="text-(--color-text-tertiary)">상태</dt>
                <dd className="text-(--color-text-primary)">{data.status}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-(--color-text-tertiary)">주소</dt>
                <dd className="text-(--color-text-primary)">{data.address}</dd>
                <dd className="text-xs text-(--color-text-tertiary)">
                  위도 {data.latitude.toFixed(4)}, 경도 {data.longitude.toFixed(4)}
                </dd>
              </div>
            </dl>
          </article>
        )}
      </section>
    </main>
  );
}
