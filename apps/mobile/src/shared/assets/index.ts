/**
 * Brand 자산 중앙화 — 각 사용처에서 깊이 다른 require 경로를 피하고
 * 단일 진실의 원천 확보.
 *
 * 자산은 packages/brand-assets 로 추출됨 (apps/mobile + apps/web 공용 SSOT).
 */
export const brandAssets = {
  logo: require('@pinch/brand-assets/logo/logo.png'),
  logoSecondary: require('@pinch/brand-assets/logo/logo-secon.png'),
} as const;
