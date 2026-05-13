/**
 * PINCH 디자인 시스템 v0 — Tokens
 *
 * SSOT: .claude/docs/디자인시스템.md
 *   D1 Identity = Pink #fa2454 (Timee 톤)
 *   D2 그린은 success(긍정) 한 의미만 — identity 그린 제거
 *   D3 베어 키 일원화 (Color-X/ 프리픽스 제거)
 *   D4 Gray 30/40/50 보강 (#cfd3d8 / #b4b9be / #8e949a)
 *
 * Tailwind/NativeWind 와 RN StyleSheet 양쪽에서 단일 진실의 원천.
 */

export const colors = {
  // Brand Identity (Pink)
  identity: '#fa2454',
  identityHover: '#ef0035',
  identitySub: '#ffd1dc',

  // Gray Scale (Cool, 9단계)
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
    identitySub: '#ffd1dc',
  },

  text: {
    primary: '#202225',
    secondary: '#4a4f55',
    tertiary: '#757b82',
    quaternary: '#b4b9be',
    primaryInverse: '#fdfdfd',
    identity: '#fa2454',
    identityStrong: '#ef0035',
  },

  border: {
    primary: '#4a4f55',
    secondary: '#b4b9be',
    tertiary: '#e0e4e8',
    identity: '#fa2454',
  },

  button: {
    primary: '#fa2454',
    primaryHover: '#ef0035',
    secondary: '#2e3236',
    secondaryHover: '#4a4f55',
    tertiary: '#e9edf0',
    tertiaryHover: '#cfd3d8',
    white: '#fdfdfd',
    whiteHover: '#e9edf0',
  },

  support: {
    success: '#1eb96e',
    successSubtle: '#e7f5ec',
    error: '#ea2831',
    errorSubtle: '#fbe8e9',
    info: '#175eff',
    infoSubtle: '#e6edfd',
    yellow: '#fef3c7',
    orange: '#f76300',
    orangeSubtle: '#ffe8d9',
    brown: '#ce6f09',
    purple: '#7d0096',
    purpleSubtle: '#f9e6ff',
  },
} as const;

export const typography = {
  fontFamily: 'Pretendard',
  letterSpacing: -0.5,
  lineHeight: 1.4,

  heading: {
    h00: { size: 24, weight: '700' as const },
    h01: { size: 20, weight: '600' as const },
    h02: { size: 18, weight: '700' as const },
    h03: { size: 18, weight: '600' as const },
    h04: { size: 16, weight: '700' as const },
    h05: { size: 16, weight: '600' as const },
  },
  body: {
    b01: { size: 14, weight: '700' as const },
    b02: { size: 14, weight: '600' as const },
    b03: { size: 14, weight: '500' as const },
    b04: { size: 14, weight: '400' as const },
  },
  caption: {
    c01: { size: 12, weight: '600' as const },
    c02: { size: 12, weight: '500' as const },
    c03: { size: 12, weight: '400' as const },
  },
} as const;

// 8-base 임시 표준 — Figma 후속 추출 시 갱신 (디자인시스템.md §10 P0)
export const spacing = {
  '01': 4,
  '02': 8,
  '03': 12,
  '04': 16,
  '05': 20,
  '06': 24,
  '07': 32,
  '08': 40,
  '09': 48,
  '10': 64,
} as const;

export const radius = {
  '01': 4,
  '02': 8,
  '03': 12,
  '04': 16,
  '05': 24,
  '07': 32,
  full: 9999,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
} as const;

export type Tokens = typeof tokens;
