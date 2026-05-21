import axios from 'axios';
import { env } from '@/shared/config/env';

const KAKAO_LOCAL_BASE = 'https://dapi.kakao.com/v2/local';

export interface KakaoAddressResult {
  /** 도로명 주소 우선, 없으면 지번 주소 */
  addressName: string;
  latitude: number;
  longitude: number;
}

interface KakaoAddressDoc {
  address_name: string;
  x: string;            // longitude
  y: string;            // latitude
  road_address?: { address_name: string } | null;
}

interface KakaoAddressResponse {
  meta: { total_count: number };
  documents: KakaoAddressDoc[];
}

/**
 * 카카오 로컬 API — 주소 → 좌표 변환.
 *   - 첫 결과만 반환 (다중 결과 선택 UX 는 W3.2)
 *   - 결과 없으면 null
 *   - 네트워크 / 키 미설정 / 4xx 등은 throw → caller 가 try/catch
 */
export async function searchAddress(query: string): Promise<KakaoAddressResult | null> {
  if (env.KAKAO_REST_API_KEY.length === 0) {
    throw new Error('KAKAO_REST_API_KEY not configured');
  }
  const { data } = await axios.get<KakaoAddressResponse>(
    `${KAKAO_LOCAL_BASE}/search/address.json`,
    {
      params: { query, size: 5 },
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
      timeout: 5_000,
    },
  );
  const doc = data.documents[0];
  if (!doc) return null;
  return {
    addressName: doc.road_address?.address_name ?? doc.address_name,
    latitude: Number(doc.y),
    longitude: Number(doc.x),
  };
}
