import {
  TextInput as RNTextInput,
  View,
  Text,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors } from '@pinch/ui-tokens';

export interface TextInputProps
  extends Pick<
    RNTextInputProps,
    | 'value'
    | 'onChangeText'
    | 'onBlur'
    | 'onFocus'
    | 'placeholder'
    | 'secureTextEntry'
    | 'autoCapitalize'
    | 'autoComplete'
    | 'autoCorrect'
    | 'keyboardType'
    | 'returnKeyType'
    | 'textContentType'
    | 'maxLength'
    | 'editable'
  > {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * 디자인 시스템 v0 기반 텍스트 인풋.
 *   - 라벨 / 에러 / 헬퍼 텍스트 슬롯
 *   - 에러 시 보더 색 = support-error
 *   - 비활성 시 배경 = gray-10
 */
export function TextInput({
  label,
  error,
  helperText,
  editable = true,
  autoCapitalize = 'none',
  autoCorrect = false,
  ...rest
}: TextInputProps) {
  const borderClass = error
    ? 'border-support-error'
    : 'border-border-tertiary';
  const bgClass = editable ? 'bg-background-primary' : 'bg-gray-10';

  return (
    <View className="w-full">
      {label !== undefined && (
        <Text className="text-text-secondary mb-2 text-sm font-medium">
          {label}
        </Text>
      )}
      <RNTextInput
        editable={editable}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        className={`h-12 rounded-xl border px-4 text-text-primary ${borderClass} ${bgClass}`}
        placeholderTextColor={colors.gray[50]}
        {...rest}
      />
      {error !== undefined && (
        <Text className="text-support-error mt-1 text-xs">{error}</Text>
      )}
      {error === undefined && helperText !== undefined && (
        <Text className="text-text-tertiary mt-1 text-xs">{helperText}</Text>
      )}
    </View>
  );
}
