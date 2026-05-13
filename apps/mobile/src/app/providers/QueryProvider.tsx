import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

/**
 * TanStack Query Provider.
 * - retry 1회 (모바일은 네트워크 불안정 가능)
 * - staleTime 30초 (정산·매칭 등 변화 빈도 고려)
 * - 향후 NetInfo 연동 시 onlineManager 도입 예정.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
