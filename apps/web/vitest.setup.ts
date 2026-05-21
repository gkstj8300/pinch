import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * @testing-library/jest-dom 매처 확장 (vitest 진입점).
 * 각 테스트 후 RTL DOM 자동 정리.
 */
afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});
