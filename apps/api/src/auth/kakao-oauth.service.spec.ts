import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KakaoOAuthService } from './kakao-oauth.service';

/**
 * KakaoOAuthService 단위 테스트.
 * fetch 를 mock 하여 카카오 API 응답을 시뮬레이션.
 */
describe('KakaoOAuthService', () => {
  let service: KakaoOAuthService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const config = new ConfigService({
      KAKAO_REST_API_KEY: 'test-rest-api-key',
      KAKAO_CLIENT_SECRET: 'test-client-secret',
    });
    service = new KakaoOAuthService(config);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  function mockResponse(status: number, body: unknown): Response {
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('KAKAO_REST_API_KEY 없으면 생성자에서 에러', () => {
    expect(() => new KakaoOAuthService(new ConfigService({}))).toThrow(
      /KAKAO_REST_API_KEY/,
    );
  });

  it('정상 응답 시 정규화된 프로필 반환', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { access_token: 'kakao-access-token', token_type: 'bearer', expires_in: 3600 }))
      .mockResolvedValueOnce(
        mockResponse(200, {
          id: 1234567,
          kakao_account: { email: 'kakao-user@kakao.com', profile: { nickname: '카카오테스터' } },
        }),
      );

    const result = await service.exchangeCodeForProfile({
      code: 'authorization-code',
      redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
    });

    expect(result).toEqual({
      providerId: '1234567',
      email: 'kakao-user@kakao.com',
      name: '카카오테스터',
    });

    // 토큰 교환 호출 검증
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://kauth.kakao.com/oauth/token');
    expect(tokenInit.method).toBe('POST');
    const tokenBody = (tokenInit.body as URLSearchParams).toString();
    expect(tokenBody).toContain('grant_type=authorization_code');
    expect(tokenBody).toContain('client_id=test-rest-api-key');
    expect(tokenBody).toContain('client_secret=test-client-secret');
    expect(tokenBody).toContain('code=authorization-code');

    // 사용자 정보 호출 검증
    const [userUrl, userInit] = fetchMock.mock.calls[1];
    expect(userUrl).toBe('https://kapi.kakao.com/v2/user/me');
    expect(userInit.headers).toMatchObject({ Authorization: 'Bearer kakao-access-token' });
  });

  it('properties.nickname fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { access_token: 't', token_type: 'bearer', expires_in: 3600 }))
      .mockResolvedValueOnce(
        mockResponse(200, {
          id: 99,
          kakao_account: { email: 'a@b.com' }, // profile 없음
          properties: { nickname: '닉네임프롭' },
        }),
      );

    const result = await service.exchangeCodeForProfile({
      code: 'c',
      redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
    });
    expect(result.name).toBe('닉네임프롭');
  });

  it('카카오가 nickname을 전혀 안 주면 기본값 사용', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { access_token: 't', token_type: 'bearer', expires_in: 3600 }))
      .mockResolvedValueOnce(
        mockResponse(200, {
          id: 99,
          kakao_account: { email: 'a@b.com' },
        }),
      );

    const result = await service.exchangeCodeForProfile({
      code: 'c',
      redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
    });
    expect(result.name).toBe('카카오워커');
  });

  it('이메일 동의 없으면 400 KAKAO_EMAIL_REQUIRED', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { access_token: 't', token_type: 'bearer', expires_in: 3600 }))
      .mockResolvedValueOnce(mockResponse(200, { id: 1, kakao_account: {} }));

    await expect(
      service.exchangeCodeForProfile({
        code: 'c',
        redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
      }),
    ).rejects.toMatchObject({ status: 400, response: { message: 'KAKAO_EMAIL_REQUIRED' } });
  });

  it('토큰 교환 400 시 INVALID_CODE', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(400, { error: 'invalid_grant' }));

    await expect(
      service.exchangeCodeForProfile({
        code: 'bad-code',
        redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('토큰 교환 5xx 시 KAKAO_API_ERROR (502)', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, 'internal error'));

    await expect(
      service.exchangeCodeForProfile({
        code: 'c',
        redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
      }),
    ).rejects.toThrow(BadGatewayException);
  });

  it('사용자 정보 호출 실패 시 KAKAO_API_ERROR', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { access_token: 't', token_type: 'bearer', expires_in: 3600 }))
      .mockResolvedValueOnce(mockResponse(401, 'invalid token'));

    await expect(
      service.exchangeCodeForProfile({
        code: 'c',
        redirectUri: 'https://auth.expo.io/@test/pinch-mobile',
      }),
    ).rejects.toThrow(BadGatewayException);
  });
});
