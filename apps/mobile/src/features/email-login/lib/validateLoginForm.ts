/**
 * 로그인 폼 검증.
 *   - 이메일: 단순 RFC 호환 정규식 (백엔드 IsEmail 와 정합)
 *   - 비밀번호: 8자 이상 (백엔드 MinLength(8) 와 정합)
 *
 * EMAIL_REGEX / PASSWORD_MIN_LENGTH 는 email-signup 과 중복 사용 →
 * 추후 shared/lib/validators.ts 로 승격 검토 (.claude/rules/code-organization.md §3).
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (values.email.length === 0) {
    errors.email = '이메일을 입력해주세요';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다';
  }

  if (values.password.length === 0) {
    errors.password = '비밀번호를 입력해주세요';
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`;
  }

  return errors;
}

export function isLoginFormValid(values: LoginFormValues): boolean {
  return Object.keys(validateLoginForm(values)).length === 0;
}
