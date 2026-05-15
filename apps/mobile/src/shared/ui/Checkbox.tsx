import { Pressable, Text, View } from 'react-native';

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * 체크박스 + 라벨.
 *   - 접근성: Pressable role=checkbox, state.checked 반영
 *   - 체크 시 identity(pink) 배경, 미체크 시 흰색 + 회색 보더
 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: CheckboxProps) {
  const boxClass = disabled
    ? 'border-border-tertiary bg-gray-10'
    : checked
      ? 'border-identity bg-identity'
      : 'border-border-secondary bg-background-primary';

  return (
    <Pressable
      onPress={disabled ? undefined : () => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      className="flex-row items-center py-1"
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded border-2 ${boxClass}`}
      >
        {checked && (
          <Text className="text-text-primary-inverse text-xs font-pretendard-bold">✓</Text>
        )}
      </View>
      <Text
        className={`ml-3 text-sm ${disabled ? 'text-text-quaternary' : 'text-text-primary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
