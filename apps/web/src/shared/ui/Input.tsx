import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

/**
 * 폼 입력 컴포넌트 — Figma 디자인 매핑.
 *   - height 36px (h-9), radius 6px, padding 12/8
 *   - 라벨: SemiBold 14, color-text-primary, 입력과 10px 간격(≈ spacing-02 8px)
 *   - 기본 테두리: --color-border-secondary (#b4b9be)
 *   - focus: identity
 *   - error 시: --color-error 테두리 + 에러 메시지
 *   - placeholder 색: --color-text-quaternary (#b4b9be)
 */
export function Input({ error, label, className = '', id, ...rest }: InputProps) {
  const borderColor = error
    ? 'border-(--color-error)'
    : 'border-(--color-border-secondary) focus:border-(--color-identity)';
  return (
    <div className="flex flex-col gap-(--spacing-02)">
      {label !== undefined && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-(--color-text-primary)"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`h-9 rounded-(--radius-015) border bg-(--color-gray-0) px-(--spacing-03) py-(--spacing-02) text-sm text-(--color-text-primary) outline-none transition-colors placeholder:text-(--color-text-quaternary) ${borderColor} ${className}`.trim()}
        {...rest}
      />
      {error !== undefined && error.length > 0 && (
        <p className="text-xs text-(--color-error)">{error}</p>
      )}
    </div>
  );
}
