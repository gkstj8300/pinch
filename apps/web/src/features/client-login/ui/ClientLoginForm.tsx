'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Button, Checkbox, Input } from '@/shared/ui';
import {
  isLoginFormValid,
  validateLoginForm,
  type LoginFormErrors,
  type LoginFormValues,
} from '../lib/validateLoginForm';
import { NotClientError, useLoginMutation } from '../api/useLoginMutation';

const INITIAL: LoginFormValues = { email: '', password: '' };
const SAVED_EMAIL_KEY = 'pinch.savedEmail';

/**
 * 사업주 이메일 로그인 폼 — Figma `node-id=521:22613` 매핑.
 *   - 두 필드 검증 통과 시 CTA 활성, disabled 시 opacity 40%
 *   - "아이디 저장": localStorage 에 이메일 저장 (mount 시 prefill)
 *   - "비밀번호 찾기": 1차 비활성 안내
 *   - 401 → INVALID_CREDENTIALS / NotClientError → "사업주 계정이 아닙니다"
 *   - 정상 → /home 으로 push
 */
export function ClientLoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>(INITIAL);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [saveEmail, setSaveEmail] = useState(false);
  const mutation = useLoginMutation();

  // mount 시 저장된 이메일 prefill
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved !== null && saved.length > 0) {
      setValues((prev) => ({ ...prev, email: saved }));
      setSaveEmail(true);
    }
  }, []);

  const errors: LoginFormErrors = validateLoginForm(values);
  const valid = isLoginFormValid(values);

  const handleChange =
    (field: keyof LoginFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!valid || mutation.isPending) return;

    try {
      await mutation.mutateAsync(values);
      // 로그인 성공 시 저장 옵션 처리
      if (typeof window !== 'undefined') {
        if (saveEmail) {
          window.localStorage.setItem(SAVED_EMAIL_KEY, values.email);
        } else {
          window.localStorage.removeItem(SAVED_EMAIL_KEY);
        }
      }
      router.replace('/home');
    } catch {
      // mutation.error 로 분기 — 인라인 메시지 표시
    }
  };

  const handleForgotPassword = () => {
    alert('비밀번호 찾기는 다음 업데이트에서 제공됩니다.');
  };

  const apiError = mutation.error;
  const apiErrorMessage = (() => {
    if (!apiError) return null;
    if (apiError instanceof NotClientError) {
      return '사업주 계정이 아닙니다. 워커앱에서 로그인해주세요.';
    }
    if (isAxiosError(apiError) && apiError.response?.status === 401) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    return '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  })();

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-(--spacing-04)">
      <Input
        id="email"
        type="email"
        autoComplete="email"
        label="아이디 (이메일)"
        placeholder="아이디(이메일) 입력"
        value={values.email}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        error={touched.email ? errors.email : undefined}
      />
      <Input
        id="password"
        type="password"
        autoComplete="current-password"
        label="비밀번호"
        placeholder="비밀번호 입력"
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleBlur('password')}
        error={touched.password ? errors.password : undefined}
      />

      <div className="flex w-full items-center justify-between">
        <Checkbox
          id="saveEmail"
          checked={saveEmail}
          onChange={(e) => setSaveEmail(e.target.checked)}
          label="아이디 저장"
        />
        <button
          type="button"
          onClick={handleForgotPassword}
          className="cursor-pointer text-sm font-medium text-(--color-text-tertiary) hover:text-(--color-text-secondary)"
        >
          비밀번호 찾기
        </button>
      </div>

      {apiErrorMessage !== null && (
        <p className="text-sm text-(--color-error)">{apiErrorMessage}</p>
      )}

      <Button type="submit" disabled={!valid || mutation.isPending} fullWidth>
        {mutation.isPending ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  );
}
