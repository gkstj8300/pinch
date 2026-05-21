/**
 * entities/user/api/auth-token 은 shared/api/apiClient 의 토큰 접근자를
 * 도메인 표면에서 재노출 (배럴). 동일 함수 참조가 보장되어야 한다 —
 * 그래야 features 가 entities 를 통해 호출하더라도 동일 SecureStore 키를
 * read/write 한다.
 */
import * as authToken from '../auth-token';
import * as apiClient from '@/shared/api/apiClient';

describe('entities/user/api/auth-token', () => {
  it('re-exports the exact same getAccessToken function from shared/api/apiClient', () => {
    expect(authToken.getAccessToken).toBe(apiClient.getAccessToken);
  });

  it('re-exports the exact same setAccessToken function from shared/api/apiClient', () => {
    expect(authToken.setAccessToken).toBe(apiClient.setAccessToken);
  });

  describe('round-trip via SecureStore mock', () => {
    beforeEach(async () => {
      await authToken.setAccessToken(null);
    });

    it('returns null when no token is stored', async () => {
      await expect(authToken.getAccessToken()).resolves.toBeNull();
    });

    it('persists a token and reads it back', async () => {
      await authToken.setAccessToken('test-token-abc');
      await expect(authToken.getAccessToken()).resolves.toBe('test-token-abc');
    });

    it('clears the token when set to null', async () => {
      await authToken.setAccessToken('test-token-abc');
      await authToken.setAccessToken(null);
      await expect(authToken.getAccessToken()).resolves.toBeNull();
    });
  });
});
