/**
 * 공고 등록 폼 검증 — 백엔드 CreateJobDto 와 1:1 정합.
 *
 *  - latitude/longitude 가 모두 0 → "주소 확인 필요" 로 분기 (카카오 검색 미완료)
 *  - startAt/endAt 은 datetime-local 형식 ("YYYY-MM-DDTHH:mm") 가정
 *  - hourlyWage 는 2026 KR 최저시급 10030 하한 (백엔드와 동일)
 */
export const MINIMUM_WAGE_KRW = 10030;

export interface JobFormValues {
  title: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  startAt: string;       // datetime-local
  endAt: string;
  hourlyWage: number;
  recruitCount: number;
}

export interface JobFormErrors {
  title?: string;
  description?: string;
  category?: string;
  address?: string;
  startAt?: string;
  endAt?: string;
  hourlyWage?: string;
  recruitCount?: string;
}

export const initialJobValues: JobFormValues = {
  title: '',
  description: '',
  category: '',
  address: '',
  latitude: 0,
  longitude: 0,
  startAt: '',
  endAt: '',
  hourlyWage: MINIMUM_WAGE_KRW,
  recruitCount: 1,
};

export function validateJobForm(values: JobFormValues): JobFormErrors {
  const errors: JobFormErrors = {};

  if (values.title.length < 5) errors.title = '제목은 5자 이상이어야 합니다';
  else if (values.title.length > 120) errors.title = '제목은 120자 이하여야 합니다';

  if (values.description.length < 10)
    errors.description = '설명은 10자 이상이어야 합니다';
  else if (values.description.length > 1000)
    errors.description = '설명은 1000자 이하여야 합니다';

  if (values.category.length === 0) errors.category = '카테고리를 선택하거나 입력해주세요';

  if (values.address.length === 0) errors.address = '주소를 입력하고 "주소 확인" 을 눌러주세요';
  else if (values.latitude === 0 && values.longitude === 0)
    errors.address = '"주소 확인" 으로 좌표를 확정해주세요';

  if (values.startAt.length === 0) errors.startAt = '시작 시각을 입력해주세요';
  if (values.endAt.length === 0) errors.endAt = '종료 시각을 입력해주세요';
  if (values.startAt && values.endAt) {
    const start = new Date(values.startAt);
    const end = new Date(values.endAt);
    if (start >= end) errors.endAt = '종료가 시작보다 이후여야 합니다';
    else if (start.getTime() < Date.now())
      errors.startAt = '시작은 현재 시점 이후여야 합니다';
  }

  if (!Number.isFinite(values.hourlyWage) || values.hourlyWage < MINIMUM_WAGE_KRW)
    errors.hourlyWage = `최저시급 ${MINIMUM_WAGE_KRW.toLocaleString()}원 이상이어야 합니다`;
  else if (values.hourlyWage > 1_000_000)
    errors.hourlyWage = '시급은 100만원 이하여야 합니다';

  if (!Number.isInteger(values.recruitCount) || values.recruitCount < 1)
    errors.recruitCount = '모집 인원은 1명 이상이어야 합니다';
  else if (values.recruitCount > 50)
    errors.recruitCount = '모집 인원은 50명 이하여야 합니다';

  return errors;
}

export function isJobFormValid(values: JobFormValues): boolean {
  return Object.keys(validateJobForm(values)).length === 0;
}

export interface CreateJobRequest {
  title: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  startAt: string;       // ISO 8601
  endAt: string;
  hourlyWage: number;
  recruitCount: number;
}

/**
 * datetime-local 의 값을 ISO 8601 로 변환.
 * datetime-local 은 브라우저 local time 이며 timezone 없음 — `new Date(...)` 시 local 로 해석됨.
 */
export function toCreateJobRequest(values: JobFormValues): CreateJobRequest {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    address: values.address,
    latitude: values.latitude,
    longitude: values.longitude,
    startAt: new Date(values.startAt).toISOString(),
    endAt: new Date(values.endAt).toISOString(),
    hourlyWage: values.hourlyWage,
    recruitCount: values.recruitCount,
  };
}
