import { describe, it, expect } from 'vitest';
import { formatJobTime } from '../formatJobTime';

describe('formatJobTime', () => {
  it('같은 날 — 시작 풀 + 종료 시간만', () => {
    // 2026-05-22 = 금요일
    const result = formatJobTime('2026-05-22T15:30:00', '2026-05-22T16:30:00');
    expect(result).toContain('5월 22일');
    expect(result).toContain('15:30');
    expect(result).toContain('16:30');
    expect(result.match(/5월/g)).toHaveLength(1);
  });

  it('다른 날 — 시작/종료 모두 풀 포맷', () => {
    const result = formatJobTime('2026-05-22T23:00:00', '2026-05-23T01:00:00');
    expect(result.match(/5월/g)).toHaveLength(2);
    expect(result).toContain('5월 22일');
    expect(result).toContain('5월 23일');
  });

  it('한국어 요일 포함', () => {
    // 2026-05-22 (금)
    const result = formatJobTime('2026-05-22T10:00:00', '2026-05-22T11:00:00');
    expect(result).toMatch(/\([일월화수목금토]\)/);
  });
});
