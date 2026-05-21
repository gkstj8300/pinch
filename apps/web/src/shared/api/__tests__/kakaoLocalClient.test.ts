import { describe, it, expect, beforeEach, vi } from 'vitest';

// env 모듈 자체를 mock — env.ts 의 `as const` 객체는 모듈 로드 시점에 freeze 되므로
// vi.stubEnv 로는 갱신 불가. vi.mock 로 모듈 export 를 통째로 교체.
vi.mock('@/shared/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    KAKAO_REST_API_KEY: 'test-kakao-key',
  },
}));

import axios from 'axios';
import { searchAddress } from '../kakaoLocalClient';

describe('searchAddress (Kakao Local API)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('정상 — 첫 결과의 road_address.address_name 우선', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: {
        meta: { total_count: 1 },
        documents: [
          {
            address_name: '서울 중구 세종대로 110',
            x: '126.97791',
            y: '37.56635',
            road_address: { address_name: '서울특별시 중구 세종대로 110' },
          },
        ],
      },
    });

    const result = await searchAddress('세종대로 110');
    expect(result).toEqual({
      addressName: '서울특별시 중구 세종대로 110',
      latitude: 37.56635,
      longitude: 126.97791,
    });
  });

  it('road_address 없으면 address_name fallback', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: {
        meta: { total_count: 1 },
        documents: [
          { address_name: '지번 주소', x: '127.0', y: '37.5', road_address: null },
        ],
      },
    });

    const result = await searchAddress('어딘가');
    expect(result?.addressName).toBe('지번 주소');
  });

  it('결과 없음 — null 반환', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { meta: { total_count: 0 }, documents: [] },
    });
    const result = await searchAddress('존재하지않는주소');
    expect(result).toBeNull();
  });

  it('네트워크 실패 — throw', async () => {
    vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Network Error'));
    await expect(searchAddress('any')).rejects.toThrow('Network Error');
  });

  it('Authorization 헤더에 KakaoAK + key', async () => {
    const spy = vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { meta: { total_count: 0 }, documents: [] },
    });
    await searchAddress('any');
    const opts = spy.mock.calls[0]?.[1] as { headers: { Authorization: string } };
    expect(opts.headers.Authorization).toBe('KakaoAK test-kakao-key');
  });
});
