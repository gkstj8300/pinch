/**
 * Tailwind (NativeWind) 설정 — PINCH 디자인 시스템 v0
 * SSOT: .claude/docs/디자인시스템.md
 *
 * 주의: 색상 값은 packages/ui-tokens/src/tokens.ts 와 동기화 유지.
 *       (tailwind.config 가 JS 모듈이라 .ts 토큰 import 못 함 → 수동 동기화)
 *       토큰 변경 시 양쪽 모두 갱신할 것.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  // NativeWind 4 + web 어댑터(expo-router) 는 'class' dark mode 를 요구.
  // 기본 'media' 시 "Cannot manually set color scheme" 런타임 에러.
  // 현재는 light only 사용 — class 모드 명시만으로 충분.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        identity: {
          DEFAULT: '#fa2454',
          hover: '#ef0035',
          sub: '#ffd1dc',
        },
        gray: {
          0: '#fdfdfd',
          10: '#e9edf0',
          20: '#e0e4e8',
          30: '#cfd3d8',
          40: '#b4b9be',
          50: '#8e949a',
          60: '#757b82',
          70: '#4a4f55',
          80: '#2e3236',
          90: '#202225',
        },
        background: {
          primary: '#fdfdfd',
          secondary: '#f3f5f7',
          tertiary: '#e9edf0',
          identity: '#fa2454',
          'identity-sub': '#ffd1dc',
        },
        text: {
          primary: '#202225',
          secondary: '#4a4f55',
          tertiary: '#757b82',
          quaternary: '#b4b9be',
          'primary-inverse': '#fdfdfd',
          identity: '#fa2454',
          'identity-strong': '#ef0035',
        },
        border: {
          primary: '#4a4f55',
          secondary: '#b4b9be',
          tertiary: '#e0e4e8',
          identity: '#fa2454',
        },
        support: {
          success: '#1eb96e',
          'success-subtle': '#e7f5ec',
          error: '#ea2831',
          'error-subtle': '#fbe8e9',
          info: '#175eff',
          'info-subtle': '#e6edfd',
        },
      },
      fontFamily: {
        sans: ['Pretendard'],
      },
      letterSpacing: {
        pinch: '-0.5px',
      },
    },
  },
  plugins: [],
};
