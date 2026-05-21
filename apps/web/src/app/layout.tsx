import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'PINCH for Business',
  description: '사업주용 PINCH — 초단기 인력 매칭 + 출퇴근 + 정산',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout.
 *
 *  - Pretendard 웹폰트 — jsdelivr CDN (orioncactus/pretendard). 1차 부트스트랩은
 *    CDN 으로 시작 (plan §6.2 옵션 A). 운영 진입 전 npm 패키지 self-host 로 전환.
 *  - Server component (default) → Providers(client) 안에 children 배치.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
