import { describe, it, expect } from 'vitest';
import {
  validateLoginForm,
  isLoginFormValid,
  type LoginFormValues,
} from '../validateLoginForm';

function values(overrides: Partial<LoginFormValues> = {}): LoginFormValues {
  return {
    email: 'client@pinch.local',
    password: 'pinch1234!',
    ...overrides,
  };
}

describe('validateLoginForm', () => {
  it('returns no errors for valid input', () => {
    expect(validateLoginForm(values())).toEqual({});
    expect(isLoginFormValid(values())).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['no @', 'foo'],
    ['no TLD', 'foo@bar'],
  ])('rejects email (%s)', (_label, email) => {
    expect(validateLoginForm(values({ email })).email).toBeDefined();
  });

  it('rejects password shorter than 8 chars', () => {
    expect(validateLoginForm(values({ password: '1234567' })).password).toBe(
      '비밀번호는 8자 이상이어야 합니다',
    );
  });

  it('accepts 8 char password (boundary)', () => {
    expect(validateLoginForm(values({ password: '12345678' })).password).toBeUndefined();
  });

  it('isLoginFormValid is false when any field has error', () => {
    expect(isLoginFormValid(values({ email: '' }))).toBe(false);
    expect(isLoginFormValid(values({ password: 'x' }))).toBe(false);
  });
});
