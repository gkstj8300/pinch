import {
  validateLoginForm,
  isLoginFormValid,
  type LoginFormValues,
} from '../validateLoginForm';

function values(overrides: Partial<LoginFormValues> = {}): LoginFormValues {
  return {
    email: 'worker001@pinch.local',
    password: 'pinch1234!',
    ...overrides,
  };
}

describe('validateLoginForm', () => {
  it('returns no errors for a valid email + 8+ char password', () => {
    expect(validateLoginForm(values())).toEqual({});
    expect(isLoginFormValid(values())).toBe(true);
  });

  describe('email', () => {
    it('rejects empty email', () => {
      const errors = validateLoginForm(values({ email: '' }));
      expect(errors.email).toBe('이메일을 입력해주세요');
    });

    it.each([
      ['no @ sign', 'not-an-email'],
      ['no domain', 'worker@'],
      ['no local part', '@pinch.local'],
      ['no TLD', 'worker@pinch'],
      ['whitespace inside', 'wor ker@pinch.local'],
    ])('rejects malformed email (%s)', (_label, email) => {
      const errors = validateLoginForm(values({ email }));
      expect(errors.email).toBe('올바른 이메일 형식이 아닙니다');
    });
  });

  describe('password', () => {
    it('rejects empty password', () => {
      const errors = validateLoginForm(values({ password: '' }));
      expect(errors.password).toBe('비밀번호를 입력해주세요');
    });

    it('rejects password shorter than 8 chars', () => {
      const errors = validateLoginForm(values({ password: '1234567' }));
      expect(errors.password).toBe('비밀번호는 8자 이상이어야 합니다');
    });

    it('accepts password exactly 8 chars (boundary)', () => {
      const errors = validateLoginForm(values({ password: '12345678' }));
      expect(errors.password).toBeUndefined();
    });
  });

  describe('isLoginFormValid', () => {
    it('returns false when any field has an error', () => {
      expect(isLoginFormValid(values({ email: '' }))).toBe(false);
      expect(isLoginFormValid(values({ password: 'short' }))).toBe(false);
    });
  });
});
