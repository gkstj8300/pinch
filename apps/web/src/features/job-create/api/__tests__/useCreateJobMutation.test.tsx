import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateJobMutation } from '../useCreateJobMutation';
import { apiClient } from '@/shared/api/apiClient';

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const sampleReq = {
  title: '카페 홀 서빙 (1시간)',
  description: '오후 피크 타임 1시간 서빙 도와주실 분 모집합니다.',
  category: 'F&B',
  address: '서울 중구 세종대로 110',
  latitude: 37.56635,
  longitude: 126.97791,
  startAt: '2026-05-22T15:30:00+09:00',
  endAt: '2026-05-22T16:30:00+09:00',
  hourlyWage: 12000,
  recruitCount: 1,
};

describe('useCreateJobMutation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('201 정상 — Job 반환 + jobs.my 캐시 무효화', async () => {
    const created = { id: '42', ...sampleReq, estimatedMinutes: 60, estimatedPay: 12000, confirmedCount: 0, checkInRadiusM: 150, status: 'OPEN' };
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: created });

    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateJobMutation(), { wrapper: wrapper(client) });

    act(() => { result.current.mutate(sampleReq); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postSpy).toHaveBeenCalledWith('/jobs', sampleReq);
    expect(result.current.data?.id).toBe('42');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['jobs', 'my'] });
  });

  it('403 CLIENT_ONLY — error 전파', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new Error('Request failed with status code 403'),
    );

    const { result } = renderHook(() => useCreateJobMutation(), {
      wrapper: wrapper(makeClient()),
    });

    act(() => { result.current.mutate(sampleReq); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/403/);
  });
});
