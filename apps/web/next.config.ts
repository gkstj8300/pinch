import type { NextConfig } from 'next';

/**
 * Next.js 설정.
 *
 *  - transpilePackages: 모노레포의 packages/* 가 ESM/TS 인 채로 노출되므로
 *    Next.js 가 빌드 단계에서 트랜스파일하도록 명시 (`@pinch/ui-tokens`).
 *  - reactStrictMode: dev 단계에서 잠재적 부작용 조기 발견.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pinch/ui-tokens'],
};

export default nextConfig;
