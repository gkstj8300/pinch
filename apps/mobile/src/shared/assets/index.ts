/**
 * Brand 자산 중앙화 — 각 사용처에서 깊이 다른 require 경로를 피하고
 * 단일 진실의 원천 확보.
 *
 * 추후 packages/brand-assets 로 분리 가능 (apps/web 도입 시 공유).
 */
export const brandAssets = {
  logo: require('../../../assets/logo.png'),
  logoSecondary: require('../../../assets/logo-secon.png'),
} as const;
