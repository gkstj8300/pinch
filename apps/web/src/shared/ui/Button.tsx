import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

/**
 * PINCH 디자인 토큰 Button.
 *   - primary: identity pink (#fa2454)
 *   - secondary: gray-80 (#2e3236)
 *   - disabled: gray-30 자동 적용
 *   - hover/active 색상은 토큰 그대로
 */
export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const base = 'h-12 rounded-(--radius-03) px-(--spacing-05) font-semibold transition-colors';
  const sizing = fullWidth ? 'w-full' : '';
  const variants: Record<Variant, string> = {
    primary: disabled
      ? 'bg-(--color-gray-30) text-(--color-text-quaternary) cursor-not-allowed'
      : 'bg-(--color-identity) text-(--color-text-inverse) hover:bg-(--color-identity-hover)',
    secondary: disabled
      ? 'bg-(--color-gray-30) text-(--color-text-quaternary) cursor-not-allowed'
      : 'bg-(--color-gray-80) text-(--color-text-inverse) hover:bg-(--color-gray-70)',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      className={`${base} ${sizing} ${variants[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
