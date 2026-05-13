/**
 * DI 토큰 + Strategy 인터페이스 재노출.
 * 동일 인터페이스로 Slice 3 에서 다른 Strategy 로 교체 가능 (e.g. DailyWorker).
 */
export const WITHHOLDING_STRATEGY = Symbol('WITHHOLDING_STRATEGY');
export type { WithholdingStrategy } from '@/libs/settlement/withholding';
