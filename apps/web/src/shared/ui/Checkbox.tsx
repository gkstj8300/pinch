import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** 옆에 표시할 라벨 텍스트 (옵션) — 미제공 시 체크박스만 렌더 */
  label?: string;
}

/**
 * 16×16 체크박스 — Figma 디자인(`node-id=463:3106`) 매핑.
 *   - 선택 시 색상: --color-button-secondary (gray-80 #2e3236)
 *   - 미선택: 테두리만 (color-border-secondary)
 *   - radius 2px (Figma 명시)
 *   - native input 을 sr-only 로 숨기고 사용자가 라벨/박스 클릭 시 토글
 */
export function Checkbox({ label, id, checked, onChange, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer select-none items-center gap-(--spacing-02)"
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={`h-4 w-4 rounded-[2px] border transition-colors ${
            checked
              ? 'border-(--color-gray-80) bg-(--color-gray-80)'
              : 'border-(--color-border-secondary) bg-(--color-gray-0)'
          }`}
        />
        {checked && (
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="absolute h-3 w-3 stroke-(--color-text-inverse)"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2.5,6.5 5,9 9.5,3.5" />
          </svg>
        )}
      </span>
      {label !== undefined && (
        <span className="text-sm font-medium text-(--color-text-secondary)">{label}</span>
      )}
    </label>
  );
}
