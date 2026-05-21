/**
 * 사업주 로그인 폼 검증.
 *   - 이메일: 단순 RFC 호환 정규식 (백엔드 IsEmail 와 정합)
 *   - 비밀번호: 8자 이상 (백엔드 MinLength(8) 와 정합)
 *
 * 모바일 features/email-login 의 동일 규칙과 의도적 미공유 (1차 별도 슬라이스).
 * 추후 packages/shared-lib/validators 추출 시 공유.
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
