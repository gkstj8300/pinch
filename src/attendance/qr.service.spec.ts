import { ConfigService } from '@nestjs/config';
import { QrService } from './qr.service';

const SECRET = 'test-secret-must-be-at-least-32-characters-long';

function makeQr(): QrService {
  const config = new ConfigService({ QR_SECRET: SECRET });
  return new QrService(config);
}

describe('QrService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('비밀키 32자 미만이면 생성자에서 에러', () => {
    const config = new ConfigService({ QR_SECRET: 'short' });
    expect(() => new QrService(config)).toThrow(/at least 32 chars/);
  });

  it('생성한 토큰은 즉시 검증 통과', () => {
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    const qr = makeQr();
    const matchId = 12345n;
    const { qrToken, expiresIn } = qr.generate(matchId);

    expect(expiresIn).toBeGreaterThan(0);
    expect(expiresIn).toBeLessThanOrEqual(30);

    expect(qr.verify(qrToken)).toBe(matchId);
  });

  it('±1 step (±30초) 윈도우 내에서 검증 통과', () => {
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    const qr = makeQr();
    const { qrToken } = qr.generate(99n);

    // 25초 후 (같은 step)
    jest.advanceTimersByTime(25_000);
    expect(qr.verify(qrToken)).toBe(99n);

    // 35초 후 (이전 step, 윈도우 내)
    jest.advanceTimersByTime(10_000);
    expect(qr.verify(qrToken)).toBe(99n);
  });

  it('60초 이상 경과하면 만료로 reject', () => {
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    const qr = makeQr();
    const { qrToken } = qr.generate(99n);

    jest.advanceTimersByTime(61_000);
    expect(qr.verify(qrToken)).toBeNull();
  });

  it('서명 위조 → null', () => {
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    const qr = makeQr();
    const { qrToken } = qr.generate(99n);
    const [matchId, step] = qrToken.split('.');
    const fake = `${matchId}.${step}.AAAAAAAAAAAAAAAA`;
    expect(qr.verify(fake)).toBeNull();
  });

  it('matchId 변경 시도 → 서명 불일치로 null', () => {
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    const qr = makeQr();
    const { qrToken } = qr.generate(99n);
    const [, step, sig] = qrToken.split('.');
    const tampered = `100.${step}.${sig}`;
    expect(qr.verify(tampered)).toBeNull();
  });

  it('잘못된 형식 → null', () => {
    const qr = makeQr();
    expect(qr.verify('')).toBeNull();
    expect(qr.verify('not-a-token')).toBeNull();
    expect(qr.verify('1.2')).toBeNull();
    expect(qr.verify('1.2.3.4')).toBeNull();
    expect(qr.verify('abc.123.def')).toBeNull(); // matchId 비숫자
    expect(qr.verify('1.abc.def')).toBeNull(); // step 비숫자
  });

  it('다른 secret 으로는 검증 불가', () => {
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    const qrA = makeQr();
    const { qrToken } = qrA.generate(99n);

    const otherConfig = new ConfigService({
      QR_SECRET: 'different-secret-must-be-at-least-32-chars',
    });
    const qrB = new QrService(otherConfig);
    expect(qrB.verify(qrToken)).toBeNull();
  });
});
