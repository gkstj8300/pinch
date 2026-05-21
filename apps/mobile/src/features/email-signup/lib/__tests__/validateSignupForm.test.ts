import {
  validateSignupForm,
  isSignupFormValid,
  toSignupRequest,
  initialSignupValues,
  type SignupFormValues,
} from '../validateSignupForm';

function values(overrides: Partial<SignupFormValues> = {}): SignupFormValues {
  return {
    email: 'new@pinch.local',
    password: 'pinch1234!',
    passwordConfirm: 'pinch1234!',
    name: '새워커',
    agreeAge14: true,
    agreeTerms: true,
    agreeMarketing: false,
    agreeEvents: false,
    referralCode: '',
    ...overrides,
  };
}

describe('initialSignupValues', () => {
  it('starts with all booleans false and strings empty', () => {
    expect(initialSignupValues).toEqual({
      email: '',
      password: '',
      passwordConfirm: '',
      name: '',
      agreeAge14: false,
      agreeTerms: false,
      agreeMarketing: false,
      agreeEvents: false,
      referralCode: '',
    });
  });
});

describe('validateSignupForm', () => {
  it('returns no errors for fully valid input', () => {
    expect(validateSignupForm(values())).toEqual({});
    expect(isSignupFormValid(values())).toBe(true);
  });

  describe('email', () => {
    it('rejects empty email', () => {
      expect(validateSignupForm(values({ email: '' })).email).toBe(
        '이메일을 입력해주세요',
      );
    });
    it('rejects malformed email', () => {
      expect(validateSignupForm(values({ email: 'foo' })).email).toBe(
        '올바른 이메일 형식이 아닙니다',
      );
    });
  });

  describe('password length', () => {
    it('rejects empty', () => {
      expect(validateSignupForm(values({ password: '', passwordConfirm: '' })).password).toBe(
        '비밀번호를 입력해주세요',
      );
    });
    it('rejects shorter than 8', () => {
      expect(
        validateSignupForm(values({ password: '1234567', passwordConfirm: '1234567' }))
          .password,
      ).toBe('비밀번호는 8자 이상이어야 합니다');
    });
    it('rejects longer than 72 (bcrypt limit)', () => {
      const long = 'a'.repeat(73);
      expect(
        validateSignupForm(values({ password: long, passwordConfirm: long })).password,
      ).toBe('비밀번호는 72자 이하여야 합니다');
    });
    it('accepts exactly 72 chars (boundary)', () => {
      const exact = 'a'.repeat(72);
      const errors = validateSignupForm(values({ password: exact, passwordConfirm: exact }));
      expect(errors.password).toBeUndefined();
    });
  });

  describe('passwordConfirm', () => {
    it('rejects empty', () => {
      expect(validateSignupForm(values({ passwordConfirm: '' })).passwordConfirm).toBe(
        '비밀번호 확인을 입력해주세요',
      );
    });
    it('rejects mismatched confirmation', () => {
      expect(
        validateSignupForm(values({ passwordConfirm: 'different!' })).passwordConfirm,
      ).toBe('비밀번호가 일치하지 않습니다');
    });
  });

  describe('name', () => {
    it('rejects empty', () => {
      expect(validateSignupForm(values({ name: '' })).name).toBe('별명을 입력해주세요');
    });
    it('rejects 1 char (below min 2)', () => {
      expect(validateSignupForm(values({ name: 'A' })).name).toBe(
        '별명은 2자 이상이어야 합니다',
      );
    });
    it('rejects 51 chars (above max 50)', () => {
      expect(validateSignupForm(values({ name: 'a'.repeat(51) })).name).toBe(
        '별명은 50자 이하여야 합니다',
      );
    });
  });

  describe('terms', () => {
    it('rejects when age14 unchecked', () => {
      expect(validateSignupForm(values({ agreeAge14: false })).terms).toBe(
        '필수 약관에 동의해주세요',
      );
    });
    it('rejects when terms unchecked', () => {
      expect(validateSignupForm(values({ agreeTerms: false })).terms).toBe(
        '필수 약관에 동의해주세요',
      );
    });
    it('passes when both required boxes are checked (optional marketing/events ignored)', () => {
      const errors = validateSignupForm(
        values({ agreeMarketing: false, agreeEvents: false }),
      );
      expect(errors.terms).toBeUndefined();
    });
  });
});

describe('toSignupRequest', () => {
  it('combines age14 + terms into termsAgreed=true and maps marketing flag', () => {
    expect(toSignupRequest(values({ agreeMarketing: true }))).toEqual({
      email: 'new@pinch.local',
      password: 'pinch1234!',
      name: '새워커',
      termsAgreed: true,
      marketingConsented: true,
    });
  });

  it('termsAgreed=false if either required box is unchecked', () => {
    expect(toSignupRequest(values({ agreeAge14: false })).termsAgreed).toBe(false);
    expect(toSignupRequest(values({ agreeTerms: false })).termsAgreed).toBe(false);
  });

  it('drops UI-only fields (passwordConfirm, agreeEvents, referralCode)', () => {
    const req = toSignupRequest(values({ agreeEvents: true, referralCode: 'PINCH' }));
    expect(req).not.toHaveProperty('passwordConfirm');
    expect(req).not.toHaveProperty('agreeEvents');
    expect(req).not.toHaveProperty('referralCode');
  });
});
