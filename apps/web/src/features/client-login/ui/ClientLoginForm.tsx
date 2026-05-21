'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Button, Input } from '@/shared/ui';
import {
  validateLoginForm,
  isLoginFormValid,
  type LoginFormValues,
  type LoginFormErrors,
} from '../lib/validateLoginForm';
import { NotClientError, useLoginMutation } from '../api/useLoginMutation';

const INITIAL: LoginFormValues = { email: '', password: '' };

/**
 * 사업주 이메일 로그인 폼.
 *   - 두 필드 모두 검증 통과 시 CTA 활성
 *   - 401 → INVALID_CREDENTIALS / NotClientError → "사업주 계정이 아닙니다"
 *   - 정상 → /home 으로 push
 */
export function ClientLoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>(INITIAL);
  const [touched, setTouched] = useState({ email: false, password: false });
  const mutation = useLoginMutation();

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
    if (!valid || mutation.isPending) return;

    try {
      await mutation.mutateAsync(values);
      router.replace('/home');
    } catch {
      // mutation.error 로 분기 — 아래 인라인 메시지에서 처리
    }
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-(--spacing-04)">
      <Input
        id="email"
        type="email"
        autoComplete="email"
        placeholder="이메일"
        value={values.email}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        error={touched.email ? errors.email : undefined}
      />
      <Input
        id="password"
        type="password"
        autoComplete="current-password"
        placeholder="비밀번호"
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleBlur('password')}
        error={touched.password ? errors.password : undefined}
      />
      {apiErrorMessage !== null && (
        <p className="text-sm text-(--color-error)">{apiErrorMessage}</p>
      )}
      <Button type="submit" disabled={!valid || mutation.isPending} fullWidth>
        {mutation.isPending ? '로그인 중...' : '로그인하기'}
      </Button>
    </form>
  );
}
