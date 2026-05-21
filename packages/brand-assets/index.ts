/**
 * 자산은 파일 경로로 import (RN: require / Next.js: ES import + next/image).
 * 본 index.ts 는 documentation 용도 — 실제 사용처는 서브경로 export 를 직접 참조한다.
 *
 *   // apps/mobile
 *   require('@pinch/brand-assets/logo/logo.png');
 *   require('@pinch/brand-assets/fonts/Pretendard-Regular.otf');
 *
 *   // apps/web (Next.js 15)
 *   import logo from '@pinch/brand-assets/logo/logo.png';
 *   import localFont from 'next/font/local';
 *   const pretendard = localFont({
 *     src: '../../packages/brand-assets/fonts/Pretendard-Regular.otf',
 *     ...
 *   });
 */
export {};
