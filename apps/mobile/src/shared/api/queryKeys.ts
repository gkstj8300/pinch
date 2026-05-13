/**
 * TanStack Query 키 팩토리 — slice 별 키 prefix 일관성.
 * 새 entity 추가 시 여기에 한 줄씩 추가.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  jobs: {
    all: () => ['jobs'] as const,
    search: (params: { lat: number; lng: number; radiusM?: number }) =>
      ['jobs', 'search', params] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },
  matches: {
    all: () => ['matches'] as const,
    mine: (status?: string) => ['matches', 'mine', status] as const,
    detail: (id: string) => ['matches', 'detail', id] as const,
  },
  wallet: {
    me: () => ['wallet', 'me'] as const,
  },
} as const;
