import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/shared/api';
import type { Job } from '../model/types';

async function fetchJob(id: string): Promise<Job> {
  const { data } = await apiClient.get<Job>(`/jobs/${id}`);
  return data;
}

/**
 * 공고 상세 — 누구나(인증된 사용자) 조회 가능. 사업주 본인 검증은 UI 가드.
 */
export function useJobDetailQuery(id: string | null) {
  return useQuery<Job, Error>({
    queryKey: queryKeys.jobs.detail(id ?? ''),
    queryFn: () => fetchJob(id as string),
    enabled: id !== null && id.length > 0,
    retry: false,
  });
}
