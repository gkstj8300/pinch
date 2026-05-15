/**
 * JWT 토큰 접근자 — entities/user 의 도메인 표면.
 * 실제 SecureStore 구현은 shared/api/apiClient 에 위치 (apiClient 의
 * Bearer interceptor 가 동일 키를 read 함). entities/user 는 도메인
 * 레벨에서 토큰을 다루는 단일 진실의 원천 역할.
 */
export { getAccessToken, setAccessToken } from '@/shared/api/apiClient';
