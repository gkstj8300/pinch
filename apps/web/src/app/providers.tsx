'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * 앱 전역 Provider (FSD app 레이어).
 *  - QueryClient 는 useState 로 생성 — Next.js 가 hot-reload 시 새 인스턴스
 *    재생성하지 않도록.
 *  - retry 비활성 / refetchOnWindowFocus 비활성 (사업주 도메인은 백그라운드
 *    리프레시 부담 적음)
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 60_000 },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
