import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMyJobsQuery } from '../useMyJobsQuery';
import { apiClient } from '@/shared/api/apiClient';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useMyJobsQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('200 정상 — MyJobsResponse 반환', async () => {
    const response = {
      items: [{ id: '1', title: 'a', category: 'F&B', address: '', latitude: 0, longitude: 0, startAt: '', endAt: '', hourlyWage: 12000, estimatedMinutes: 60, estimatedPay: 12000, recruitCount: 1, confirmedCount: 0, checkInRadiusM: 150, status: 'OPEN' }],
      total: 1,
      page: 1,
      limit: 20,
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: response });

    const { result } = renderHook(() => useMyJobsQuery(1, 20), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getSpy).toHaveBeenCalledWith('/jobs/my', { params: { page: 1, limit: 20 } });
    expect(result.current.data?.total).toBe(1);
  });

  it('401 — error 전파', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
      new Error('Request failed with status code 401'),
    );

    const { result } = renderHook(() => useMyJobsQuery(1, 20), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/401/);
  });
});
