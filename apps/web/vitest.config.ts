import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vitest 설정 — happy-dom 환경, testing-library/jest-dom 매처 확장.
 *  - `@/` alias 는 tsconfig.paths 와 동일 (./src/*)
 *  - happy-dom: jsdom 보다 빠르고 RN-test-library 와 격리
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
});
