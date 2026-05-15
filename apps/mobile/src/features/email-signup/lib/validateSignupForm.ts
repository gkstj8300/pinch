/**
 * 회원가입 폼 검증.
 * 백엔드 SignupDto 와 정합:
 *   - email   IsEmail + MaxLength 255
 *   - password MinLength 8 + MaxLength 72 (bcrypt 한계)
 *   - name    Length 2~50
 *   - termsAgreed Boolean(true)
 *
 * 화면 전용(백엔드 미전송) 필드:
 *   - passwordConfirm: password 와 일치
 *   - agreeAge14 / agreeTerms 둘 다 true → termsAgreed=true
 *   - agreeMarketing → marketingConsented
 *   - agreeEvents / referralCode: 본 작업 UI 만, 백엔드 미전송
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

export interface SignupFormValues {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  agreeAge14: boolean;
  agreeTerms: boolean;
  agreeMarketing: boolean;
  agreeEvents: boolean;
  referralCode: string;
}

export interface SignupFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  name?: string;
  terms?: string;
}

export const initialSignupValues: SignupFormValues = {
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  agreeAge14: false,
  agreeTerms: false,
  agreeMarketing: false,
  agreeEvents: false,
  referralCode: '',
};

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const errors: SignupFormErrors = {};

  if (values.email.length === 0) {
    errors.email = '이메일을 입력해주세요';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = '올바른 이메일 형식이 아닙니다';
  }

  if (values.password.length === 0) {
    errors.password = '비밀번호를 입력해주세요';
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다`;
  } else if (values.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다`;
  }

  if (values.passwordConfirm.length === 0) {
    errors.passwordConfirm = '비밀번호 확인을 입력해주세요';
  } else if (values.passwordConfirm !== values.password) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다';
  }

  if (values.name.length === 0) {
    errors.name = '별명을 입력해주세요';
  } else if (values.name.length < NAME_MIN_LENGTH) {
    errors.name = `별명은 ${NAME_MIN_LENGTH}자 이상이어야 합니다`;
  } else if (values.name.length > NAME_MAX_LENGTH) {
    errors.name = `별명은 ${NAME_MAX_LENGTH}자 이하여야 합니다`;
  }

  if (!values.agreeAge14 || !values.agreeTerms) {
    errors.terms = '필수 약관에 동의해주세요';
  }

  return errors;
}

export function isSignupFormValid(values: SignupFormValues): boolean {
  return Object.keys(validateSignupForm(values)).length === 0;
}

/**
 * UI 폼 값 → 백엔드 SignupDto 변환.
 * 필수 약관 두 개가 모두 true 일 때만 termsAgreed=true.
 */
export function toSignupRequest(values: SignupFormValues): {
  email: string;
  password: string;
  name: string;
  termsAgreed: boolean;
  marketingConsented: boolean;
} {
  return {
    email: values.email,
    password: values.password,
    name: values.name,
    termsAgreed: values.agreeAge14 && values.agreeTerms,
    marketingConsented: values.agreeMarketing,
  };
}
