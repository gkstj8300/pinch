/**
 * TanStack Query key factory — 중앙 관리.
 * apps/mobile 의 동일 파일과 의도적 미공유 (1차 별도 도메인).
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
} as const;
