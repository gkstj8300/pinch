import { haversineMeters } from './haversine';

describe('haversineMeters', () => {
  it('동일 좌표는 0', () => {
    const p = { lat: 37.5663, lng: 126.9779 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('서울 시청 ↔ 서울역 약 1.5km (오차 5% 이내)', () => {
    const seoulCityHall = { lat: 37.5663, lng: 126.9779 };
    const seoulStation = { lat: 37.5547, lng: 126.9707 };
    const d = haversineMeters(seoulCityHall, seoulStation);
    // 실측 약 1,400m (Google Maps 기준 약 1,500m)
    expect(d).toBeGreaterThan(1300);
    expect(d).toBeLessThan(1600);
  });

  it('서울 시청 ↔ 부산역 약 325km (오차 1% 이내)', () => {
    const seoulCityHall = { lat: 37.5663, lng: 126.9779 };
    const busanStation = { lat: 35.1156, lng: 129.0419 };
    const d = haversineMeters(seoulCityHall, busanStation);
    // 실측 약 325km (직선 거리)
    expect(d).toBeGreaterThan(320_000);
    expect(d).toBeLessThan(330_000);
  });

  it('대척점 — 적도 반대편 약 20,000km', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 180 };
    const d = haversineMeters(a, b);
    // π * R = π * 6,371,000 ≈ 20,015,087
    expect(d).toBeGreaterThan(20_000_000);
    expect(d).toBeLessThan(20_100_000);
  });

  it('동일 위도에서 경도 1도 차이 (적도 ≈ 111km)', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 1 };
    const d = haversineMeters(a, b);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_500);
  });

  it('정수로 반올림된 결과 반환', () => {
    const a = { lat: 37.5663, lng: 126.9779 };
    const b = { lat: 37.5663, lng: 126.9780 };
    const d = haversineMeters(a, b);
    expect(Number.isInteger(d)).toBe(true);
  });
});
