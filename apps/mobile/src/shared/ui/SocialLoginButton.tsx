import { ActivityIndicator, Pressable, Text, View } from 'react-native';

/**
 * 소셜 로그인 진입 버튼 — 각 브랜드 공식 디자인 가이드라인 준수.
 *
 *   - kakao:  https://developers.kakao.com/docs/ko/kakaologin/design-guide
 *   - naver:  https://developers.naver.com/docs/login/bi/bi.md
 *   - google: https://developers.google.com/identity/branding-guidelines
 *
 * 로고는 본 작업 범위 외 (SVG/PNG 자산 미준비) — 현재는 브랜드 이니셜
 * placeholder 로 대체. 자산 도입 시 brandAssets 에 추가하고 본 컴포넌트
 * 의 LOGO_PLACEHOLDER 부분만 교체하면 됨.
 */
export type SocialProvider = 'kakao' | 'naver' | 'google';

interface SocialLoginButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
}

interface ProviderConfig {
  label: string;
  bg: string;
  fg: string;
  border?: string;
  iconLetter: string;
}

const PROVIDER_CONFIG: Record<SocialProvider, ProviderConfig> = {
  kakao: {
    label: '카카오로 시작하기',
    bg: '#FEE500',
    fg: '#191919',
    iconLetter: 'K',
  },
  naver: {
    label: '네이버로 시작하기',
    bg: '#03C75A',
    fg: '#FFFFFF',
    iconLetter: 'N',
  },
  google: {
    label: 'Google로 시작하기',
    bg: '#FFFFFF',
    fg: '#1F1F1F',
    border: '#DADCE0',
    iconLetter: 'G',
  },
};

export function SocialLoginButton({
  provider,
  onPress,
  loading = false,
}: SocialLoginButtonProps) {
  const cfg = PROVIDER_CONFIG[provider];

  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={cfg.label}
      accessibilityState={{ busy: loading }}
      className="h-12 flex-row items-center justify-center rounded-xl"
      style={{
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        borderWidth: cfg.border !== undefined ? 1 : 0,
      }}
    >
      {loading ? (
        <ActivityIndicator color={cfg.fg} />
      ) : (
        <>
          {/* 로고 placeholder — 추후 brand SVG/PNG 자산으로 교체 */}
          <View
            className="mr-2 h-6 w-6 items-center justify-center rounded-full"
            style={{
              backgroundColor: provider === 'google' ? '#F1F3F4' : 'rgba(0,0,0,0.08)',
            }}
          >
            <Text
              className="text-xs font-pretendard-bold"
              style={{ color: cfg.fg }}
            >
              {cfg.iconLetter}
            </Text>
          </View>
          <Text
            className="text-base font-pretendard-semibold"
            style={{ color: cfg.fg }}
          >
            {cfg.label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
