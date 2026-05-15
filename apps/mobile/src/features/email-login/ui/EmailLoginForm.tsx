import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, TextInput } from '@/shared/ui';
import { useLoginMutation } from '../api/useLoginMutation';
import {
  isLoginFormValid,
  validateLoginForm,
  type LoginFormValues,
} from '../lib/validateLoginForm';

interface EmailLoginFormProps {
  onSuccess: () => void;
}

function parseApiError(err: unknown): string | undefined {
  if (err === null || err === undefined) return undefined;
  const message: unknown = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (message === 'INVALID_CREDENTIALS') {
    return '이메일 또는 비밀번호가 올바르지 않습니다';
  }
  return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요';
}

export function EmailLoginForm({ onSuccess }: EmailLoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const mutation = useLoginMutation();

  const errors = validateLoginForm(values);
  const canSubmit = isLoginFormValid(values) && !mutation.isPending;
  const apiError = mutation.isError ? parseApiError(mutation.error) : undefined;

  const submit = () => {
    setTouched({ email: true, password: true });
    if (!canSubmit) return;
    mutation.mutate(values, { onSuccess });
  };

  return (
    <View className="gap-4">
      <TextInput
        label="이메일"
        value={values.email}
        onChangeText={(email) => setValues((v) => ({ ...v, email }))}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={touched.email ? errors.email : undefined}
      />
      <TextInput
        label="비밀번호"
        value={values.password}
        onChangeText={(password) => setValues((v) => ({ ...v, password }))}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        placeholder="8자 이상"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        error={touched.password ? errors.password : undefined}
      />
      {apiError !== undefined && (
        <Text className="text-support-error text-xs">{apiError}</Text>
      )}
      <Button
        label="로그인하기"
        onPress={submit}
        disabled={!canSubmit}
        loading={mutation.isPending}
      />
    </View>
  );
}
