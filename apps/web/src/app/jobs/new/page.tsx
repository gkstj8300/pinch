'use client';

import Link from 'next/link';
import { JobCreateForm } from '@/features/job-create';

export default function NewJobPage() {
  return (
    <main className="min-h-screen bg-(--color-bg-secondary)">
      <header className="flex items-center gap-(--spacing-04) bg-(--color-bg-primary) px-(--spacing-06) py-(--spacing-04) shadow-sm">
        <Link
          href="/jobs"
          className="text-sm text-(--color-text-secondary) hover:text-(--color-identity)"
        >
          ← 목록으로
        </Link>
        <h1 className="text-xl font-bold text-(--color-text-primary)">공고 등록</h1>
      </header>

      <section className="mx-auto max-w-2xl px-(--spacing-04) py-(--spacing-07)">
        <div className="rounded-(--radius-04) bg-(--color-bg-primary) p-(--spacing-07)">
          <JobCreateForm />
        </div>
      </section>
    </main>
  );
}
