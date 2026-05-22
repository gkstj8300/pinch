import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

/**
 * PINCH 디자인 토큰 Button — Figma `node-id=521:22635` 매핑.
 *   - primary: identity-hover (#ef0035)
 *   - secondary: gray-80 (#2e3236)
 *   - disabled: 동일 bg + opacity 40% (Figma 표준)
 *   - height 48px (h-12), radius 6px (--radius-015), gap 6px
 */
export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex h-12 items-center justify-center gap-(--spacing-015) rounded-(--radius-015) px-(--spacing-03) py-(--spacing-02) text-base font-semibold transition-colors';
  const sizing = fullWidth ? 'w-full' : '';
  const variants: Record<Variant, string> = {
    primary: 'bg-(--color-identity-hover) text-(--color-text-inverse) hover:bg-(--color-identity)',
    secondary: 'bg-(--color-gray-80) text-(--color-text-inverse) hover:bg-(--color-gray-70)',
  };
  const stateModifiers = disabled ? 'opacity-40 cursor-not-allowed' : '';
  return (
    <button
      type="button"
      disabled={disabled}
      className={`${base} ${sizing} ${variants[variant]} ${stateModifiers} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
