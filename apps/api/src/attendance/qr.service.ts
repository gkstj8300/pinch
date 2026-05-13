import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * 매칭별 동적 QR 토큰.
 *
 * 토큰 형식: `<matchId>.<step>.<sig>`
 *   - step  = floor(now / 30s) — 30초마다 회전
 *   - sig   = HMAC-SHA256(QR_SECRET, "<matchId>.<step>")[..16]
 *
 * 보안 모델:
 *   - QR 자체는 "사업주가 현장에서 화면에 띄움" 의 증거 (물리적 근접성)
 *   - 워커 신원 검증은 JWT(@CurrentUser)가 별도 처리
 *   - 시간 윈도우 ±1 step(±30초) — 클라이언트 시계 오차 허용
 *
 * 정적 QR 대비 이점: 캡처·공유로 우회 불가 (다른 step 으로 빠르게 만료).
 */
@Injectable()
export class QrService {
  private static readonly STEP_SECONDS = 30;
  private static readonly ALLOWED_DRIFT = 1; // ±1 step

  private readonly logger = new Logger(QrService.name);
  private readonly secret: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('QR_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('QR_SECRET must be at least 32 chars');
    }
    this.secret = secret;
  }

  /**
   * 현재 시각 기준 QR 토큰 생성.
   * @returns qrToken + 다음 회전까지 남은 초
   */
  generate(matchId: bigint): { qrToken: string; expiresIn: number } {
    const step = this.currentStep();
    const sig = this.sign(matchId.toString(), step);
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn = QrService.STEP_SECONDS - (nowSec % QrService.STEP_SECONDS);
    return {
      qrToken: `${matchId}.${step}.${sig}`,
      expiresIn,
    };
  }

  /**
   * 토큰 검증. 통과 시 matchId 반환, 실패 시 null.
   *
   * 실패 사유:
   *   - 형식 오류
   *   - step 이 현재 시각 ±1 step 범위를 벗어남 (만료/미래)
   *   - HMAC 불일치 (위조)
   */
  verify(token: string): bigint | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [matchIdStr, stepStr, sig] = parts;

    if (!/^\d+$/.test(matchIdStr) || !/^\d+$/.test(stepStr)) return null;

    const step = Number(stepStr);
    if (!Number.isInteger(step) || step < 0) return null;

    const now = this.currentStep();
    if (Math.abs(now - step) > QrService.ALLOWED_DRIFT) return null;

    const expected = this.sign(matchIdStr, step);
    if (!QrService.constantTimeEqual(sig, expected)) return null;

    try {
      return BigInt(matchIdStr);
    } catch {
      return null;
    }
  }

  private currentStep(): number {
    return Math.floor(Date.now() / 1000 / QrService.STEP_SECONDS);
  }

  private sign(matchIdStr: string, step: number): string {
    return createHmac('sha256', this.secret)
      .update(`${matchIdStr}.${step}`)
      .digest('base64url')
      .slice(0, 16);
  }

  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}
