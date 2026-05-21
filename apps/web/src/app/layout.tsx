import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import './globals.css';

/**
 * Pretendard 4종 weight — packages/brand-assets 의 self-host OTF.
 * 디자인 시스템 v0 §5 (Regular/Medium/SemiBold/Bold) 와 정합. CDN 의존 제거.
 */
const pretendard = localFont({
  src: [
    {
      path: '../../../../packages/brand-assets/fonts/Pretendard-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../../packages/brand-assets/fonts/Pretendard-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../../packages/brand-assets/fonts/Pretendard-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../../../packages/brand-assets/fonts/Pretendard-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-pretendard',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PINCH for Business',
  description: '사업주용 PINCH — 초단기 인력 매칭 + 출퇴근 + 정산',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout — server component.
 *  - Pretendard 폰트는 next/font/local (packages/brand-assets) 로 self-host
 *  - favicon 은 src/app/ 내 정적 파일로 자동 serving (Next.js 15 convention)
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
