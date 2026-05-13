/**
 * 두 WGS84 좌표 사이의 대권 거리(미터).
 * 지구 반경 R = 6,371,000 m 기준 — 일반적 LBS 정확도 ±0.5% 이내.
 *
 * 사용 범위 가이드:
 *   - 체크인 거리(수십~수백 m): 본 함수로 충분
 *   - 100km 이상: PostGIS ST_Distance(geography) 권장
 */
export function haversineMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));

  return Math.round(R * c);
}
