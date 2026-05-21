import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/**
 * ESLint 9 flat config + eslint-config-next.
 *  - Next.js Core Web Vitals 권장 규칙 + TypeScript 규칙 활성화
 *  - frontend-coding-rules.md 의 import type / `@/` alias / 인라인 상수 금지 등
 *    프로젝트 룰은 추후 별도 plugin 으로 확장
 */
export default [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];
