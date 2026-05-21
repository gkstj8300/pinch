'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Button, Input } from '@/shared/ui';
import {
  initialJobValues,
  isJobFormValid,
  toCreateJobRequest,
  validateJobForm,
  type JobFormValues,
} from '../lib/validateJobForm';
import { useCreateJobMutation } from '../api/useCreateJobMutation';
import { AddressSearchField } from './AddressSearchField';

const CATEGORY_SUGGESTIONS = ['F&B', '카페', '편의점', '배달', '청소', '이사', '행사'];

/**
 * 사업주 공고 등록 폼.
 *   - 카카오 주소 검색 후 좌표 자동 채움
 *   - HTML5 datetime-local 시간 입력
 *   - 검증 통과 + 좌표 확정 시 CTA 활성
 *   - 등록 성공 → /jobs/[id] 로 push
 */
export function JobCreateForm() {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>(initialJobValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const mutation = useCreateJobMutation();

  const errors = validateJobForm(values);
  const valid = isJobFormValid(values);

  function patch<K extends keyof JobFormValues>(field: K, value: JobFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  const handleAddressInput = (address: string) => {
    // 사용자가 주소 텍스트 변경 시 기존 좌표 초기화 — 재검색 필요 명시
    setValues((prev) => ({ ...prev, address, latitude: 0, longitude: 0 }));
  };

  const handleAddressConfirm = (next: { address: string; latitude: number; longitude: number }) => {
    setValues((prev) => ({ ...prev, ...next }));
    setTouched((prev) => ({ ...prev, address: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      title: true,
      description: true,
      category: true,
      address: true,
      startAt: true,
      endAt: true,
      hourlyWage: true,
      recruitCount: true,
    });
    if (!valid || mutation.isPending) return;
    try {
      const created = await mutation.mutateAsync(toCreateJobRequest(values));
      router.push(`/jobs/${created.id}`);
    } catch {
      // 에러 표시는 아래 apiErrorMessage 에서
    }
  };

  const apiError = mutation.error;
  const apiErrorMessage = (() => {
    if (!apiError) return null;
    if (isAxiosError(apiError)) {
      if (apiError.response?.status === 403) return '사업주 계정만 공고를 등록할 수 있습니다.';
      if (apiError.response?.status === 400) {
        const code = (apiError.response.data as { message?: string })?.message;
        if (code === 'INVALID_TIME_RANGE') return '시작 시각이 종료 시각보다 이후입니다.';
        if (code === 'START_IN_PAST') return '시작 시각이 현재보다 과거입니다.';
        return '입력값을 다시 확인해주세요.';
      }
    }
    return '등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  })();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-(--spacing-05)">
      <datalist id="category-suggestions">
        {CATEGORY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <Input
        id="title"
        label="제목"
        placeholder="예: 카페 홀 서빙 (1시간)"
        value={values.title}
        onChange={(e) => patch('title', e.target.value)}
        onBlur={() => setTouched((p) => ({ ...p, title: true }))}
        error={touched.title ? errors.title : undefined}
      />

      <div className="flex flex-col gap-(--spacing-01)">
        <label htmlFor="description" className="text-sm text-(--color-text-secondary)">
          설명
        </label>
        <textarea
          id="description"
          className={`min-h-[120px] rounded-(--radius-03) border px-(--spacing-04) py-(--spacing-03) text-base text-(--color-text-primary) outline-none transition-colors ${
            touched.description && errors.description
              ? 'border-(--color-error)'
              : 'border-(--color-border-tertiary) focus:border-(--color-identity)'
          }`}
          placeholder="업무 내용을 자세히 적어주세요"
          value={values.description}
          onChange={(e) => patch('description', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, description: true }))}
        />
        {touched.description && errors.description !== undefined && (
          <p className="text-xs text-(--color-error)">{errors.description}</p>
        )}
      </div>

      <Input
        id="category"
        label="카테고리"
        list="category-suggestions"
        placeholder="예: F&B / 카페 / 편의점 ..."
        value={values.category}
        onChange={(e) => patch('category', e.target.value)}
        onBlur={() => setTouched((p) => ({ ...p, category: true }))}
        error={touched.category ? errors.category : undefined}
      />

      <div className="flex flex-col gap-(--spacing-01)">
        <label className="text-sm text-(--color-text-secondary)">주소</label>
        <AddressSearchField
          address={values.address}
          latitude={values.latitude}
          longitude={values.longitude}
          onAddressInput={handleAddressInput}
          onConfirm={handleAddressConfirm}
          error={touched.address ? errors.address : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-(--spacing-04)">
        <Input
          id="startAt"
          label="시작 시각"
          type="datetime-local"
          value={values.startAt}
          onChange={(e) => patch('startAt', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, startAt: true }))}
          error={touched.startAt ? errors.startAt : undefined}
        />
        <Input
          id="endAt"
          label="종료 시각"
          type="datetime-local"
          value={values.endAt}
          onChange={(e) => patch('endAt', e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, endAt: true }))}
          error={touched.endAt ? errors.endAt : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-(--spacing-04)">
        <Input
          id="hourlyWage"
          label="시급 (원)"
          type="number"
          min={10030}
          step={10}
          value={values.hourlyWage}
          onChange={(e) => patch('hourlyWage', Number(e.target.value))}
          onBlur={() => setTouched((p) => ({ ...p, hourlyWage: true }))}
          error={touched.hourlyWage ? errors.hourlyWage : undefined}
        />
        <Input
          id="recruitCount"
          label="모집 인원"
          type="number"
          min={1}
          max={50}
          value={values.recruitCount}
          onChange={(e) => patch('recruitCount', Number(e.target.value))}
          onBlur={() => setTouched((p) => ({ ...p, recruitCount: true }))}
          error={touched.recruitCount ? errors.recruitCount : undefined}
        />
      </div>

      {apiErrorMessage !== null && (
        <p className="text-sm text-(--color-error)">{apiErrorMessage}</p>
      )}

      <Button type="submit" disabled={!valid || mutation.isPending} fullWidth>
        {mutation.isPending ? '등록 중...' : '공고 등록'}
      </Button>
    </form>
  );
}
