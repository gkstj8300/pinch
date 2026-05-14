import { View } from 'react-native';
import { Checkbox } from '@/shared/ui';
import type { SignupFormValues } from '../lib/validateSignupForm';

type TermFieldName = 'agreeAge14' | 'agreeTerms' | 'agreeMarketing' | 'agreeEvents';

interface TermsAgreementGroupProps {
  values: Pick<SignupFormValues, TermFieldName>;
  onChange: (field: TermFieldName, next: boolean) => void;
  onAllChange: (next: boolean) => void;
}

interface TermItem {
  field: TermFieldName;
  label: string;
  required: boolean;
}

const TERMS: TermItem[] = [
  { field: 'agreeAge14', label: '만 14세 이상입니다', required: true },
  { field: 'agreeTerms', label: '이용약관 동의', required: true },
  { field: 'agreeMarketing', label: '개인정보 마케팅 활용 동의 (선택)', required: false },
  { field: 'agreeEvents', label: '이벤트·혜택 알림 수신 동의 (선택)', required: false },
];

/**
 * 약관 동의 그룹.
 *   - 전체동의 토글: 모두 false → 모두 true / 일부 true → 모두 true / 모두 true → 모두 false
 *   - 필수(만14세·이용약관) 미체크 시 회원가입 버튼 disabled
 *   - 각 항목의 상세("›") 진입은 콘텐츠 확정 후 별도 작업 (계획서 §11 R8)
 */
export function TermsAgreementGroup({
  values,
  onChange,
  onAllChange,
}: TermsAgreementGroupProps) {
  const allChecked = TERMS.every((t) => values[t.field]);

  return (
    <View className="gap-2 rounded-xl bg-background-secondary p-4">
      <Checkbox
        checked={allChecked}
        onChange={() => onAllChange(!allChecked)}
        label="전체 동의하기"
      />
      <View className="my-2 h-px bg-border-tertiary" />
      {TERMS.map((t) => (
        <Checkbox
          key={t.field}
          checked={values[t.field]}
          onChange={(next) => onChange(t.field, next)}
          label={t.required ? `[필수] ${t.label}` : t.label}
        />
      ))}
    </View>
  );
}
