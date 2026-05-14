import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors } from '@pinch/ui-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'kakao';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

const KAKAO_BG = '#FEE500';
const KAKAO_FG = '#191919';

const variantClass: Record<ButtonVariant, { container: string; text: string }> = {
  primary: { container: 'bg-identity', text: 'text-text-primary-inverse' },
  secondary: { container: 'bg-background-tertiary', text: 'text-text-primary' },
  kakao: { container: '', text: '' }, // 카카오 브랜드 색은 inline style 로 적용 (디자인 시스템 외 색)
};

/**
 * 공통 버튼 — 4가지 시각 상태.
 *   - variant='primary'   : 메인 CTA (identity pink)
 *   - variant='secondary' : 보조 CTA (gray tertiary)
 *   - variant='kakao'     : 카카오 브랜드 컬러 (#FEE500)
 *   - disabled / loading  : gray-30 배경, gray-50 텍스트 (variant 무관)
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isInactive = disabled || loading;
  const isKakao = variant === 'kakao' && !isInactive;

  const containerClass = isInactive
    ? 'bg-gray-30'
    : variantClass[variant].container;
  const textClass = isInactive
    ? 'text-gray-50'
    : variantClass[variant].text;

  return (
    <Pressable
      onPress={isInactive ? undefined : onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      className={`h-12 items-center justify-center rounded-xl ${containerClass}`}
      style={isKakao ? { backgroundColor: KAKAO_BG } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.primaryInverse} />
      ) : (
        <Text
          className={`text-base font-semibold ${textClass}`}
          style={isKakao ? { color: KAKAO_FG } : undefined}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
