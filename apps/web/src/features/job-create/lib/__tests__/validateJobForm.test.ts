import { describe, it, expect } from 'vitest';
import {
  validateJobForm,
  isJobFormValid,
  initialJobValues,
  toCreateJobRequest,
  MINIMUM_WAGE_KRW,
  type JobFormValues,
} from '../validateJobForm';

function future(minutes: number): string {
  // datetime-local 형식 ("YYYY-MM-DDTHH:mm")
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function values(overrides: Partial<JobFormValues> = {}): JobFormValues {
  return {
    title: '카페 홀 서빙 (1시간)',
    description: '오후 피크 타임 1시간 서빙 도와주실 분 모집합니다.',
    category: 'F&B',
    address: '서울 중구 세종대로 110',
    latitude: 37.56635,
    longitude: 126.97791,
    startAt: future(60),
    endAt: future(120),
    hourlyWage: 12000,
    recruitCount: 1,
    ...overrides,
  };
}

describe('validateJobForm', () => {
  it('initialJobValues 는 hourlyWage 기본값이 최저시급', () => {
    expect(initialJobValues.hourlyWage).toBe(MINIMUM_WAGE_KRW);
    expect(initialJobValues.recruitCount).toBe(1);
  });

  it('정상 입력은 오류 없음', () => {
    expect(validateJobForm(values())).toEqual({});
    expect(isJobFormValid(values())).toBe(true);
  });

  it('제목 5자 미만 거부 / 120자 초과 거부', () => {
    expect(validateJobForm(values({ title: 'abc' })).title).toBeDefined();
    expect(validateJobForm(values({ title: 'a'.repeat(121) })).title).toBeDefined();
  });

  it('설명 10자 미만 / 1000자 초과 거부', () => {
    expect(validateJobForm(values({ description: 'short' })).description).toBeDefined();
    expect(validateJobForm(values({ description: 'a'.repeat(1001) })).description).toBeDefined();
  });

  it('카테고리 미입력 거부', () => {
    expect(validateJobForm(values({ category: '' })).category).toBeDefined();
  });

  it('좌표가 0,0 이면 "주소 확인" 안내', () => {
    const errors = validateJobForm(values({ latitude: 0, longitude: 0 }));
    expect(errors.address).toContain('주소 확인');
  });

  it('시작 >= 종료 거부', () => {
    const t = future(60);
    expect(validateJobForm(values({ startAt: t, endAt: t })).endAt).toBeDefined();
  });

  it('시작이 과거 거부', () => {
    expect(
      validateJobForm(values({ startAt: future(-60), endAt: future(60) })).startAt,
    ).toBeDefined();
  });

  it('시급 최저 미만 거부', () => {
    expect(validateJobForm(values({ hourlyWage: 10000 })).hourlyWage).toBeDefined();
  });

  it('시급 100만원 초과 거부', () => {
    expect(validateJobForm(values({ hourlyWage: 1_000_001 })).hourlyWage).toBeDefined();
  });

  it('모집 인원 0 / 51 거부', () => {
    expect(validateJobForm(values({ recruitCount: 0 })).recruitCount).toBeDefined();
    expect(validateJobForm(values({ recruitCount: 51 })).recruitCount).toBeDefined();
  });
});

describe('toCreateJobRequest', () => {
  it('datetime-local 을 ISO 로 변환 + UI 전용 필드 없음', () => {
    const req = toCreateJobRequest(values());
    expect(req.startAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(req.startAt).toMatch(/Z|[+\-]\d{2}:\d{2}/);
    expect(req).toHaveProperty('title');
    expect(req).toHaveProperty('latitude');
    expect(req).not.toHaveProperty('passwordConfirm');
  });
});
