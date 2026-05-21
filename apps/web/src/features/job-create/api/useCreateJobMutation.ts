import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { Job } from '@/entities/job';
import type { CreateJobRequest } from '../lib/validateJobForm';

async function createJobFn(req: CreateJobRequest): Promise<Job> {
  const { data } = await apiClient.post<Job>('/jobs', req);
  return data;
}

/**
 * 공고 등록 — onSuccess 시 jobs.my 캐시 무효화 (목록 자동 갱신).
 * caller 는 mutation.mutateAsync 후 router.push('/jobs/[id]') 처리.
 */
export function useCreateJobMutation() {
  const queryClient = useQueryClient();
  return useMutation<Job, Error, CreateJobRequest>({
    mutationFn: createJobFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs', 'my'] });
    },
  });
}
