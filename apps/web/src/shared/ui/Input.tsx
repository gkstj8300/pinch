import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

/**
 * 폼 입력 컴포넌트. error 가 있으면 border + 에러 메시지 표시.
 * label 은 옵셔널 (1차 로그인 폼은 placeholder 만 사용).
 */
export function Input({ error, label, className = '', id, ...rest }: InputProps) {
  const borderColor = error
    ? 'border-(--color-error)'
    : 'border-(--color-border-tertiary) focus:border-(--color-identity)';
  return (
    <div className="flex flex-col">
      {label !== undefined && (
        <label
          htmlFor={id}
          className="mb-(--spacing-01) text-sm text-(--color-text-secondary)"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`h-12 rounded-(--radius-03) border px-(--spacing-04) text-base text-(--color-text-primary) outline-none transition-colors ${borderColor} ${className}`.trim()}
        {...rest}
      />
      {error !== undefined && error.length > 0 && (
        <p className="mt-(--spacing-01) text-xs text-(--color-error)">{error}</p>
      )}
    </div>
  );
}
