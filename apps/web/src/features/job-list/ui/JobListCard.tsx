'use client';

import Link from 'next/link';
import { formatJobTime, type Job, type JobStatus } from '@/entities/job';

interface JobListCardProps {
  job: Job;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  DRAFT: '작성중',
  OPEN: '모집중',
  CLOSED: '마감',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_COLOR: Record<JobStatus, string> = {
  DRAFT: 'bg-(--color-gray-20) text-(--color-text-secondary)',
  OPEN: 'bg-(--color-success-subtle) text-(--color-success)',
  CLOSED: 'bg-(--color-gray-20) text-(--color-text-secondary)',
  IN_PROGRESS: 'bg-(--color-info-subtle) text-(--color-info)',
  COMPLETED: 'bg-(--color-gray-10) text-(--color-text-tertiary)',
  CANCELLED: 'bg-(--color-error-subtle) text-(--color-error)',
};

export function JobListCard({ job }: JobListCardProps) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex flex-col gap-(--spacing-02) rounded-(--radius-03) border border-(--color-border-tertiary) bg-(--color-bg-primary) p-(--spacing-05) transition-colors hover:border-(--color-identity)"
    >
      <div className="flex items-center justify-between gap-(--spacing-02)">
        <h3 className="text-base font-semibold text-(--color-text-primary)">{job.title}</h3>
        <span
          className={`rounded-(--radius-full) px-(--spacing-03) py-(--spacing-01) text-xs ${STATUS_COLOR[job.status]}`}
        >
          {STATUS_LABEL[job.status]}
        </span>
      </div>
      <p className="text-xs text-(--color-text-tertiary)">
        {job.category} · {job.address}
      </p>
      <p className="text-sm text-(--color-text-secondary)">
        {formatJobTime(job.startAt, job.endAt)}
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-(--color-text-secondary)">
          시급 {job.hourlyWage.toLocaleString()}원
        </span>
        <span className="text-(--color-text-tertiary)">
          {job.confirmedCount}/{job.recruitCount}명 모집
        </span>
      </div>
    </Link>
  );
}
