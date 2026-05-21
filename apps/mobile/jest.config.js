/**
 * jest 설정 — jest-expo preset 위에 모노레포 alias + 테스트 setup 추가.
 *
 *  - preset: jest-expo (react-native/jest-preset + Expo babel 변환 + RN 모듈 매핑)
 *  - moduleNameMapper: tsconfig.json paths 의 `@/` alias 와 정합
 *  - setupFilesAfterEnv: 테스트 framework(expect) 로드 후 실행 — RN 매처 확장 + 모듈 mock
 *  - testMatch: src 하위 __tests__ 만 (e2e, mock 디렉터리는 제외)
 *  - transformIgnorePatterns: jest-expo 기본값 유지 (RN/Expo 패키지 트랜스파일 허용)
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  clearMocks: true,
  resetMocks: false,
};
