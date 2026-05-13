/**
 * 원천세 계산 Strategy.
 *
 * PINCH 정산 모델은 두 가지 신고 방식 중 하나를 선택해야 한다:
 *   1) 사업소득(프리랜서) — 3.3% (소득세 3% + 지방세 0.3%) ← 현재 채택
 *   2) 일용근로소득 — (일급 - 150,000원) × 6% × (1 - 0.55) ≈ 2.97%
 *
 * 현재 PoC 단계는 (1) 사업소득 방식. 운영 단계에서 세무사 자문 후
 * (2) 일용근로소득 방식 전환 가능성 있음 → Strategy 패턴으로 분리.
 *
 * 모든 금액은 **원 단위 정수** (소수점 회피).
 */

export type WithholdingStrategyName = 'BUSINESS_INCOME' | 'DAILY_WORKER';

export interface WithholdingResult {
  grossAmount: number;       // 세전 (원)
  withholdingTax: number;    // 원천세 합계 (양수, 원)
  netAmount: number;         // 실수령 (원)
  taxBreakdown: {
    incomeTax: number;       // 소득세
    localTax: number;        // 지방소득세 (= 소득세 × 10%)
  };
  strategy: WithholdingStrategyName;
}

export interface WithholdingStrategy {
  readonly name: WithholdingStrategyName;
  calculate(grossAmount: number): WithholdingResult;
}

/**
 * 10원 단위 절사 — 한국 세무 관례.
 */
function floorTo10(value: number): number {
  return Math.floor(value / 10) * 10;
}

/**
 * 사업소득 (3.3%)
 *   소득세 = floor10(gross × 3%)
 *   지방세 = floor10(소득세 × 10%)
 *   원천세 = 소득세 + 지방세
 *   실수령 = gross - 원천세
 */
export class BusinessIncomeStrategy implements WithholdingStrategy {
  readonly name: WithholdingStrategyName = 'BUSINESS_INCOME';

  calculate(grossAmount: number): WithholdingResult {
    if (!Number.isInteger(grossAmount) || grossAmount < 0) {
      throw new Error(`gross must be a non-negative integer (got ${grossAmount})`);
    }
    const incomeTax = floorTo10((grossAmount * 3) / 100);
    const localTax = floorTo10((incomeTax * 10) / 100);
    const withholdingTax = incomeTax + localTax;
    return {
      grossAmount,
      withholdingTax,
      netAmount: grossAmount - withholdingTax,
      taxBreakdown: { incomeTax, localTax },
      strategy: this.name,
    };
  }
}

/**
 * 일용근로소득 (참고용 — Slice 3 이후 전환 대비)
 *   과세표준 = max(0, 일급 - 150,000)
 *   소득세 = floor10(과세표준 × 6% × 0.45)  # 산출세액 × 근로소득세액공제 55%
 *   지방세 = floor10(소득세 × 10%)
 */
export class DailyWorkerStrategy implements WithholdingStrategy {
  readonly name: WithholdingStrategyName = 'DAILY_WORKER';
  private static readonly DAILY_EXEMPTION = 150_000;

  calculate(grossAmount: number): WithholdingResult {
    if (!Number.isInteger(grossAmount) || grossAmount < 0) {
      throw new Error(`gross must be a non-negative integer (got ${grossAmount})`);
    }
    const taxableBase = Math.max(0, grossAmount - DailyWorkerStrategy.DAILY_EXEMPTION);
    const incomeTax = floorTo10((taxableBase * 6 * 45) / 10000);
    const localTax = floorTo10((incomeTax * 10) / 100);
    const withholdingTax = incomeTax + localTax;
    return {
      grossAmount,
      withholdingTax,
      netAmount: grossAmount - withholdingTax,
      taxBreakdown: { incomeTax, localTax },
      strategy: this.name,
    };
  }
}
