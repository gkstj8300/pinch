import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, TextInput } from '@/shared/ui';
import { TermsAgreementGroup } from './TermsAgreementGroup';
import { useSignupMutation } from '../api/useSignupMutation';
import {
  initialSignupValues,
  isSignupFormValid,
  toSignupRequest,
  validateSignupForm,
  type SignupFormValues,
} from '../lib/validateSignupForm';

interface SignupFormProps {
  onSuccess: () => void;
}

function parseApiError(err: unknown): string | undefined {
  if (err === null || err === undefined) return undefined;
  const message: unknown = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (message === 'EMAIL_TAKEN') return '이미 가입된 이메일입니다';
  if (message === 'NAME_TAKEN') return '이미 사용 중인 별명입니다';
  if (message === 'TERMS_REQUIRED') return '필수 약관에 동의해주세요';
  return '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요';
}

type TermFieldName = 'agreeAge14' | 'agreeTerms' | 'agreeMarketing' | 'agreeEvents';

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [values, setValues] = useState<SignupFormValues>(initialSignupValues);
  const [touched, setTouched] = useState<Record<keyof SignupFormValues, boolean>>({
    email: false,
    password: false,
    passwordConfirm: false,
    name: false,
    agreeAge14: false,
    agreeTerms: false,
    agreeMarketing: false,
    agreeEvents: false,
    referralCode: false,
  });
  const mutation = useSignupMutation();

  const errors = validateSignupForm(values);
  const canSubmit = isSignupFormValid(values) && !mutation.isPending;
  const apiError = mutation.isError ? parseApiError(mutation.error) : undefined;

  const setField = <K extends keyof SignupFormValues>(field: K, v: SignupFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: v }));
  };

  const handleTermsChange = (field: TermFieldName, next: boolean) => setField(field, next);
  const handleAllTerms = (next: boolean) =>
    setValues((prev) => ({
      ...prev,
      agreeAge14: next,
      agreeTerms: next,
      agreeMarketing: next,
      agreeEvents: next,
    }));

  const submit = () => {
    setTouched((t) => ({ ...t, email: true, password: true, passwordConfirm: true, name: true }));
    if (!canSubmit) return;
    mutation.mutate(toSignupRequest(values), { onSuccess });
  };

  return (
    <View className="gap-4">
      <TextInput
        label="이메일"
        value={values.email}
        onChangeText={(email) => setField('email', email)}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={touched.email ? errors.email : undefined}
      />

      {/* 이메일 인증하기 — 본 작업에서는 dev stub (계획서 §3.2.4) */}
      <Button label="이메일 인증하기 (준비 중)" onPress={() => undefined} disabled />

      <TextInput
        label="비밀번호"
        value={values.password}
        onChangeText={(password) => setField('password', password)}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        placeholder="8자 이상"
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        error={touched.password ? errors.password : undefined}
      />

      <TextInput
        label="비밀번호 확인"
        value={values.passwordConfirm}
        onChangeText={(passwordConfirm) => setField('passwordConfirm', passwordConfirm)}
        onBlur={() => setTouched((t) => ({ ...t, passwordConfirm: true }))}
        placeholder="비밀번호 다시 입력"
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        error={touched.passwordConfirm ? errors.passwordConfirm : undefined}
      />

      <TextInput
        label="별명"
        value={values.name}
        onChangeText={(name) => setField('name', name)}
        onBlur={() => setTouched((t) => ({ ...t, name: true }))}
        placeholder="2~50자, 중복 불가"
        autoCapitalize="none"
        maxLength={50}
        error={touched.name ? errors.name : undefined}
      />

      <TermsAgreementGroup
        values={{
          agreeAge14: values.agreeAge14,
          agreeTerms: values.agreeTerms,
          agreeMarketing: values.agreeMarketing,
          agreeEvents: values.agreeEvents,
        }}
        onChange={handleTermsChange}
        onAllChange={handleAllTerms}
      />

      <TextInput
        label="추천 코드 (선택)"
        value={values.referralCode}
        onChangeText={(referralCode) => setField('referralCode', referralCode)}
        placeholder="추천인 코드"
        autoCapitalize="characters"
        helperText="본 작업에서는 입력만 가능 (백엔드 미반영)"
      />

      {apiError !== undefined && (
        <Text className="text-support-error text-xs">{apiError}</Text>
      )}

      <Button
        label="회원가입 완료"
        onPress={submit}
        disabled={!canSubmit}
        loading={mutation.isPending}
      />
    </View>
  );
}
