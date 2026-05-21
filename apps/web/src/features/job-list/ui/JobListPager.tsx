'use client';

import { Button } from '@/shared/ui';

interface JobListPagerProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (next: number) => void;
}

/**
 * 단순 prev/next 페이저. 1차는 페이지 점프 미지원.
 */
export function JobListPager({ page, total, limit, onPageChange }: JobListPagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex items-center justify-center gap-(--spacing-04)">
      <Button
        type="button"
        variant="secondary"
        disabled={isFirst}
        onClick={() => onPageChange(page - 1)}
        className="h-10 px-(--spacing-04) text-sm"
      >
        이전
      </Button>
      <span className="text-sm text-(--color-text-secondary)">
        {page} / {totalPages}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={isLast}
        onClick={() => onPageChange(page + 1)}
        className="h-10 px-(--spacing-04) text-sm"
      >
        다음
      </Button>
    </div>
  );
}
