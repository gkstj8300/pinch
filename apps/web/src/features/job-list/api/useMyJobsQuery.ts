import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/shared/api';
import type { MyJobsResponse } from '@/entities/job';

async function fetchMyJobs(page: number, limit: number): Promise<MyJobsResponse> {
  const { data } = await apiClient.get<MyJobsResponse>('/jobs/my', {
    params: { page, limit },
  });
  return data;
}

/**
 * 사업주 본인 공고 목록 — offset 페이지네이션.
 * 401 은 apiClient interceptor 가 refresh 시도 후 실패 시 호출자에게 에러.
 */
export function useMyJobsQuery(page: number, limit: number) {
  return useQuery<MyJobsResponse, Error>({
    queryKey: queryKeys.jobs.my(page, limit),
    queryFn: () => fetchMyJobs(page, limit),
    retry: false,
    staleTime: 30_000,
  });
}
