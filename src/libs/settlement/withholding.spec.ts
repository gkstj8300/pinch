import {
  BusinessIncomeStrategy,
  DailyWorkerStrategy,
} from './withholding';

describe('BusinessIncomeStrategy (3.3%)', () => {
  const s = new BusinessIncomeStrategy();

  it.each([
    // [gross,    incomeTax, localTax, withhold, net]
    [10_000,     300,       30,       330,      9_670],
    [50_000,     1_500,     150,      1_650,    48_350],
    [100_000,    3_000,     300,      3_300,    96_700],
    [123_456,    3_700,     370,      4_070,    119_386], // 10원 절사 확인
    [6_000,      180,       10,       190,      5_810],   // 30분 × 12,000/h 시나리오
    [12_400,     370,       30,       400,      12_000],
  ])('gross=%i → income=%i, local=%i, withhold=%i, net=%i', (gross, incTax, locTax, wh, net) => {
    const r = s.calculate(gross);
    expect(r.taxBreakdown.incomeTax).toBe(incTax);
    expect(r.taxBreakdown.localTax).toBe(locTax);
    expect(r.withholdingTax).toBe(wh);
    expect(r.netAmount).toBe(net);
  });

  it('무결성: gross == net + withhold', () => {
    [10_000, 50_000, 123_456, 999_999].forEach((gross) => {
      const r = s.calculate(gross);
      expect(r.netAmount + r.withholdingTax).toBe(gross);
    });
  });

  it('gross=0 → 모두 0', () => {
    const r = s.calculate(0);
    expect(r.withholdingTax).toBe(0);
    expect(r.netAmount).toBe(0);
    expect(r.taxBreakdown.incomeTax).toBe(0);
    expect(r.taxBreakdown.localTax).toBe(0);
  });

  it('음수 또는 비정수는 에러', () => {
    expect(() => s.calculate(-1)).toThrow();
    expect(() => s.calculate(100.5)).toThrow();
  });

  it('strategy 이름 = BUSINESS_INCOME', () => {
    expect(s.calculate(10_000).strategy).toBe('BUSINESS_INCOME');
    expect(s.name).toBe('BUSINESS_INCOME');
  });
});

describe('DailyWorkerStrategy (일용근로소득)', () => {
  const s = new DailyWorkerStrategy();

  it('일급 ≤ 15만원이면 비과세 (withhold=0)', () => {
    [50_000, 100_000, 150_000].forEach((gross) => {
      const r = s.calculate(gross);
      expect(r.withholdingTax).toBe(0);
      expect(r.netAmount).toBe(gross);
    });
  });

  it('일급 20만원 → 과세표준 5만원, 소득세 1,350원, 지방세 130원', () => {
    // 50000 × 6% × 0.45 = 1350
    const r = s.calculate(200_000);
    expect(r.taxBreakdown.incomeTax).toBe(1_350);
    expect(r.taxBreakdown.localTax).toBe(130);
    expect(r.withholdingTax).toBe(1_480);
    expect(r.netAmount).toBe(198_520);
  });

  it('strategy 이름 = DAILY_WORKER', () => {
    expect(s.calculate(200_000).strategy).toBe('DAILY_WORKER');
    expect(s.name).toBe('DAILY_WORKER');
  });
});
