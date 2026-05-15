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
        // 기본 sans — Pretendard Regular. fontWeight 클래스 (font-bold 등)
        // 는 OS 가 Pretendard family 내에서 weight 매칭 시도.
        // 완벽한 weight 분기가 필요한 경우 아래 별도 클래스 사용.
        sans: ['Pretendard-Regular'],
        'pretendard': ['Pretendard-Regular'],
        'pretendard-medium': ['Pretendard-Medium'],
        'pretendard-semibold': ['Pretendard-SemiBold'],
        'pretendard-bold': ['Pretendard-Bold'],
      },
      letterSpacing: {
        pinch: '-0.5px',
      },
      // PINCH 로고 전용 사이즈 토큰 — logo.png 종횡비 약 2.8:1 보존
      // (높이 × 너비) sm 28×80 / md 40×112 / lg 56×156
      height: {
        'logo-sm': '28px',
        'logo-md': '40px',
        'logo-lg': '56px',
      },
      width: {
        'logo-sm': '80px',
        'logo-md': '112px',
        'logo-lg': '156px',
      },
    },
  },
  plugins: [],
};
