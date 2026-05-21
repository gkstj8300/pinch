'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/shared/ui';
import { JobListCard, JobListPager, useMyJobsQuery } from '@/features/job-list';

/**
 * 사업주 본인 공고 목록.
 *   - useMyJobsQuery offset 페이지네이션
 *   - 빈 상태: 첫 공고 등록 안내
 */
export default function JobsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, error } = useMyJobsQuery(page, limit);

  return (
    <main className="min-h-screen bg-(--color-bg-secondary)">
      <header className="flex items-center justify-between bg-(--color-bg-primary) px-(--spacing-06) py-(--spacing-04) shadow-sm">
        <h1 className="text-xl font-bold text-(--color-text-primary)">내 공고</h1>
        <Link href="/jobs/new">
          <Button className="h-10 px-(--spacing-04) text-sm">공고 등록하기</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-(--spacing-04) py-(--spacing-07)">
        {isLoading && (
          <p className="text-center text-(--color-text-secondary)">불러오는 중...</p>
        )}
        {error && (
          <p className="text-center text-(--color-error)">
            목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        )}
        {data && data.items.length === 0 && (
          <div className="rounded-(--radius-04) bg-(--color-bg-primary) p-(--spacing-09) text-center">
            <p className="text-(--color-text-primary)">아직 등록한 공고가 없습니다.</p>
            <p className="mt-(--spacing-02) text-sm text-(--color-text-tertiary)">
              첫 공고를 등록하고 워커를 매칭받아보세요.
            </p>
            <Link href="/jobs/new" className="mt-(--spacing-05) inline-block">
              <Button>공고 등록하기</Button>
            </Link>
          </div>
        )}
        {data && data.items.length > 0 && (
          <div className="flex flex-col gap-(--spacing-04)">
            {data.items.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
            <div className="mt-(--spacing-05)">
              <JobListPager
                page={data.page}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
