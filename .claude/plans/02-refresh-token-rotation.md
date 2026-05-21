# Refresh Token 회전 도입 계획 (F-07)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | Refresh Token 회전 도입 계획 |
| 버전 | v0.1.0 |
| 작성일 | 2026-05-21 |
| 기반 문서 | .claude/plans/01-mobile-login-flow.md, .claude/docs/API명세.md, .claude/설계서.md, apps/api/src/auth/auth.controller.ts, apps/api/src/auth/auth.service.ts, apps/api/src/auth/jwt.strategy.ts, apps/api/prisma/schema.prisma, apps/mobile/src/shared/api/apiClient.ts |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-21 | — | 신규 작성 — DB 기반 refresh token 회전 + 모바일 axios interceptor 자동 재시도 도입 계획 정의 |

---

## 2. 개요 및 배경

### 2.1 목적

PINCH Worker Mobile 의 인증을 **accessToken 단일 발급** 구조에서 **access + refresh 쌍 회전(rotation)** 구조로 전환한다. 액세스 토큰 만료 시 사용자가 재로그인하지 않아도 자동 갱신되도록 하고, 토큰 탈취 시 reuse 감지로 강제 로그아웃이 가능한 보안 모델을 갖춘다.

### 2.2 현재 상태 (정찰 결과)

- 백엔드 `apps/api/src/auth/*`
  - `/auth/login`, `/auth/signup`, `/auth/oauth/kakao`, `/auth/me` 만 존재.
  - `AuthService.buildAuthResult` → `signAccessToken` 만 호출. 응답에 `accessToken` 만 포함.
  - `JwtModule` 단일 secret(`JWT_SECRET`) + `expiresIn: '1d'` 동기 등록.
  - `JwtStrategy.validate` 가 DB 에서 user 재조회 — 인증 검증은 정상.
  - `prisma/schema.prisma` 에 refresh token 관련 테이블 **없음** (코드 grep — 카카오 OAuth 의 `refresh_token` 만 외부 응답으로 매칭됨, 별개).
- 모바일 `apps/mobile/src/shared/api/apiClient.ts`
  - 단일 `ACCESS_TOKEN_KEY = 'pinch.accessToken'`. Platform 별 SecureStore / localStorage 분기.
  - 401 응답 시 `setAccessToken(null)` 호출 → 호출자는 mutation.error 로 분기 (재시도 로직 없음).
- 환경 변수: `JWT_SECRET`, `JWT_EXPIRES_IN=1d` 만 정의. refresh 용 secret 미정의.

### 2.3 본 작업 범위 (포함)

- ✅ `RefreshToken` 테이블 추가 마이그레이션 + Prisma 모델
- ✅ `AuthService.refresh` + `AuthService.logout` + reuse 감지 로직
- ✅ `POST /auth/refresh`, `POST /auth/logout` 엔드포인트 신설
- ✅ 기존 `/auth/login`, `/auth/signup`, `/auth/oauth/kakao` 응답에 `refreshToken` 추가
- ✅ access 토큰 TTL 단축 (1d → 15분), refresh TTL 14일
- ✅ 모바일 `apiClient` 의 refresh token 저장 + 401 자동 재시도 + 동시 401 직렬화
- ✅ 모바일 logout 흐름 갱신 (`clearSession` + `/auth/logout` 호출)
- ✅ 백엔드 jest spec (refresh 정상, reuse 감지, expired 거부, logout)
- ✅ 모바일 jest 테스트 (interceptor 자동 재시도, refresh 실패 시 logout)
- ✅ API명세 §3.1 + 설계서 §3.1 동기화 (F-07 후속으로 명시)

### 2.4 본 작업에서 제외

| 제외 항목 | 사유 | 후속 |
|---|---|---|
| 디바이스 식별자 / 멀티 세션 관리 UI | 1차 출시 단순화 — 세션 목록 조회 UI 없음 | 별도 PR |
| Refresh token rotation 의 grace period | 단순 즉시 무효화로 충분 (동시 요청은 클라이언트 직렬화로 처리) | 모니터링 후 필요 시 |
| 웹 클라이언트 HttpOnly cookie 전환 | `apps/web` 아직 미존재 | W1 진행 시 결정 |
| RefreshToken 만료 자동 청소 cron | 1차 출시는 만료 검사로 무효화. 누적 row 는 추후 정리 | 운영 단계 진입 시 |

### 2.5 핵심 결정 사항 (사용자 합의 완료)

| 결정 | 값 | 근거 |
|---|---|---|
| 저장 전략 | **DB 테이블 + 회전 (옵션 A)** | reuse 감지·서버측 철회·토큰 탈취 대응 가능 |
| Access TTL | **15분** | 회전 도입 후 탈취 시 노출 시간 최소화 |
| Refresh TTL | **14일** | 일반적 모바일 앱 세션 길이 |
| Refresh 보관 | bcrypt **hash** 만 DB 저장 (raw 는 클라이언트만) | DB 유출 시 토큰 직접 탈취 방지 |
| 회전 정책 | 매 refresh 마다 새 (access+refresh) 쌍 발급 + 이전 refresh 즉시 무효 | 표준 OAuth refresh rotation |
| Reuse 감지 | 이미 사용된(revoked) refresh 가 재사용되면 **해당 user 의 모든 refresh 무효화** | 탈취 의심 — 강제 로그아웃 |
| 모바일 401 자동 재시도 | interceptor 가 1회 자동 refresh → 원 요청 재시도. refresh 도 실패면 양 토큰 무효화 + 호출자 에러 | 사용성 + 무한 루프 방지 |
| 동시 401 처리 | 단일 refresh promise 공유 — N 개 동시 요청이 1회만 refresh | 백엔드 부하 + race condition 방지 |

---

## 3. DB 스키마

### 3.1 새 마이그레이션 — `20260521_refresh_token`

```sql
CREATE TABLE refresh_tokens (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        CHAR(60)    NOT NULL,            -- bcrypt cost=10 결과 길이
  issued_at         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ(6) NOT NULL,
  rotated_at        TIMESTAMPTZ(6),                  -- 회전 시 채워짐 (정상 사용)
  revoked_at        TIMESTAMPTZ(6),                  -- reuse 감지 / logout 시 채워짐
  revoke_reason     VARCHAR(40),                     -- 'ROTATED' | 'LOGOUT' | 'REUSE_DETECTED'
  parent_id         BIGINT REFERENCES refresh_tokens(id), -- 회전 체인 추적
  created_at        TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx
  ON refresh_tokens(user_id, revoked_at, expires_at);

CREATE INDEX refresh_tokens_parent_idx
  ON refresh_tokens(parent_id) WHERE parent_id IS NOT NULL;
```

### 3.2 Prisma 모델

```prisma
model RefreshToken {
  id            BigInt    @id @default(autoincrement())
  userId        BigInt    @map("user_id")
  tokenHash     String    @map("token_hash") @db.Char(60)
  issuedAt      DateTime  @default(now()) @map("issued_at") @db.Timestamptz(6)
  expiresAt     DateTime  @map("expires_at") @db.Timestamptz(6)
  rotatedAt     DateTime? @map("rotated_at") @db.Timestamptz(6)
  revokedAt     DateTime? @map("revoked_at") @db.Timestamptz(6)
  revokeReason  String?   @map("revoke_reason") @db.VarChar(40)
  parentId      BigInt?   @map("parent_id")

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent        RefreshToken? @relation("RefreshTokenChain", fields: [parentId], references: [id])
  children      RefreshToken[] @relation("RefreshTokenChain")

  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId, revokedAt, expiresAt])
  @@index([parentId])
  @@map("refresh_tokens")
}
```

User 모델에 `refreshTokens RefreshToken[]` 관계 추가.

> **token_hash 만 저장 — raw token 은 클라이언트만 보유**. lookup 은 user_id 로 후보군을 좁힌 뒤 `bcrypt.compare` 로 검증.

---

## 4. 백엔드 변경

### 4.1 환경 변수

`apps/api/.env.example`:

```dotenv
# JWT — access (단축)
JWT_SECRET=change-me-in-production-min-32-chars
JWT_EXPIRES_IN=15m

# JWT — refresh (별도 secret)
JWT_REFRESH_SECRET=change-me-in-production-min-32-chars-different
JWT_REFRESH_EXPIRES_IN=14d
```

### 4.2 `AuthService` 변경

```typescript
// 새 인터페이스
interface AuthResult {
  accessToken: string;
  refreshToken: string;       // ★ 추가
  user: { id; email; name; role; isVerified };
}

// 새 메서드
class AuthService {
  // 기존 buildAuthResult 가 refresh 도 함께 발급
  private async buildAuthResult(user, parentId?: bigint): Promise<AuthResult>;

  async refresh(rawRefreshToken: string): Promise<AuthResult>;
  async logout(rawRefreshToken: string): Promise<void>;

  private async issueRefreshToken(userId: bigint, parentId?: bigint): Promise<{ raw: string; record: RefreshToken }>;
  private async findActiveRefreshToken(rawToken: string, payload: RefreshPayload): Promise<RefreshToken>;
  private async revokeAllForUser(userId: bigint, reason: 'REUSE_DETECTED'): Promise<void>;
}
```

### 4.3 Refresh JWT payload

```typescript
interface RefreshJwtPayload {
  sub: string;            // user id
  tid: string;            // refresh_tokens.id (lookup key — DB 검증용)
  iat?: number;
  exp?: number;
}
```

> 액세스 토큰 payload(`JwtPayload`) 와 별도. refresh 는 별도 secret(`JWT_REFRESH_SECRET`) 으로 sign.

### 4.4 회전 흐름

```
POST /auth/refresh { refreshToken: "<raw>" }
  ├─ jwt.verifyAsync(raw, REFRESH_SECRET) → payload { sub, tid }
  │     ↳ verify 실패 (만료/위조) → 401 INVALID_REFRESH
  ├─ DB: SELECT FROM refresh_tokens WHERE id=tid AND user_id=sub
  │     ↳ 없음 → 401 INVALID_REFRESH
  ├─ bcrypt.compare(raw, token_hash)
  │     ↳ 불일치 → 401 INVALID_REFRESH
  ├─ 만료 검사 (expires_at < now) → 401 REFRESH_EXPIRED
  ├─ revoked_at IS NOT NULL ?
  │     ├─ YES (revoke_reason='ROTATED') → reuse 감지!
  │     │     ↳ revoke_all_for_user(sub, 'REUSE_DETECTED')
  │     │     ↳ 401 REFRESH_REUSE_DETECTED
  │     └─ NO → 정상 흐름
  └─ 회전:
       ├─ 새 (access, refresh) 발급 + parent_id=tid
       ├─ 기존 record.revoked_at=now, revoke_reason='ROTATED', rotated_at=now
       └─ AuthResult 반환
```

### 4.5 `AuthController` 변경

```typescript
@Post('refresh')
@HttpCode(200)
refresh(@Body() dto: RefreshDto) {
  return this.auth.refresh(dto.refreshToken);
}

@Post('logout')
@HttpCode(204)
async logout(@Body() dto: RefreshDto) {
  await this.auth.logout(dto.refreshToken);
}
```

`RefreshDto`:
```typescript
class RefreshDto {
  @IsString() @MaxLength(500)
  refreshToken!: string;
}
```

> `/auth/logout` 은 비로그인(401) 도 200/204 처리 가능 — refresh 미일치 시 silent 통과 (logout 은 idempotent).

---

## 5. 모바일 변경

### 5.1 토큰 저장 확장

`shared/api/apiClient.ts`:

```typescript
const ACCESS_TOKEN_KEY = 'pinch.accessToken';
const REFRESH_TOKEN_KEY = 'pinch.refreshToken';

export async function getRefreshToken(): Promise<string | null>;
export async function setRefreshToken(token: string | null): Promise<void>;
```

### 5.2 401 자동 재시도 interceptor

```typescript
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  try {
    const { data } = await axios.post(`${env.API_BASE_URL}/auth/refresh`, { refreshToken: refresh });
    await setAccessToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    await setAccessToken(null);
    await setRefreshToken(null);
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status !== 401 || original._retried) {
      if (error.response?.status === 401) {
        await setAccessToken(null);
        await setRefreshToken(null);
      }
      return Promise.reject(error);
    }
    original._retried = true;

    refreshPromise ??= performRefresh();
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (!newToken) return Promise.reject(error);
    original.headers.set('Authorization', `Bearer ${newToken}`);
    return apiClient.request(original);
  },
);
```

> **`/auth/refresh` 자체의 401 / `/auth/logout`** 은 재시도 대상 제외. `original.url` 검사로 가드.

### 5.3 `entities/user` Public API 확장

```typescript
// entities/user/index.ts
export { getRefreshToken, setRefreshToken } from './api';
```

`entities/user/api/auth-token.ts` 가 함께 re-export.

### 5.4 logout 흐름

```typescript
// entities/user/model/store.ts
export async function clearSession(): Promise<void> {
  const refresh = await getRefreshToken();
  if (refresh) {
    // best-effort — 네트워크 실패해도 로컬 무효화는 진행
    try { await apiClient.post('/auth/logout', { refreshToken: refresh }); } catch {}
  }
  await setAccessToken(null);
  await setRefreshToken(null);
  useAuthStore.getState().clearUser();
}
```

### 5.5 mutation onSuccess 갱신

`useLoginMutation`, `useSignupMutation`, `useKakaoOAuthMutation` 의 응답에서 `refreshToken` 도 함께 저장:

```typescript
onSuccess: async (data) => {
  await setAccessToken(data.accessToken);
  await setRefreshToken(data.refreshToken);    // ★ 추가
  setUser({ id, email, name, role });
}
```

---

## 6. API 계약 변경

### 6.1 응답 형태 (`/auth/signup` · `/auth/login` · `/auth/oauth/kakao`)

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id", "email", "name", "role", "isVerified" }
}
```

### 6.2 `POST /auth/refresh`

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response (200):** `/auth/login` 응답과 동일 (user 포함 — 모바일이 갱신 시 user 메타 동기화 가능)

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 누락 |
| 401 | `INVALID_REFRESH` | JWT 검증 실패 / DB 미존재 / hash 불일치 |
| 401 | `REFRESH_EXPIRED` | `expires_at < now` |
| 401 | `REFRESH_REUSE_DETECTED` | revoked 토큰 재사용 — 모든 세션 무효화됨 |

### 6.3 `POST /auth/logout`

**Request:** `{ "refreshToken": "..." }`
**Response:** 204 No Content

**비고:** 미일치/만료 refresh 도 204 (idempotent).

---

## 7. 테스트 계획

`.claude/rules/test-guide.md` + `.claude/rules/phase-review-rule.md` Phase 5 적용.

### 7.1 백엔드 spec (Jest)

| 대상 | 파일 | 케이스 |
|---|---|---|
| `AuthService.signup/login/oauth` 응답에 refresh 포함 | 기존 spec 보강 | refreshToken 필드 존재 + DB row 생성 |
| `AuthService.refresh` | `auth.refresh.service.spec.ts` | 정상 회전 / 만료 거부 / 위조 거부 / reuse 감지 시 모든 토큰 revoked |
| `AuthService.logout` | 동일 | 정상 / 미일치도 throw 안 함 |
| `JwtStrategy` | 기존 그대로 (access 검증만) | — |

### 7.2 모바일 spec (Jest)

| 대상 | 검증 |
|---|---|
| `useLoginMutation` / `useSignupMutation` 갱신 | 200 응답 시 refreshToken 도 저장됨 |
| `apiClient` 401 interceptor | 401 1회 받으면 /auth/refresh 호출 → 새 access 로 원 요청 재시도 / refresh 실패면 양쪽 토큰 무효화 |
| `apiClient` 동시 401 | 5개 동시 요청 → /auth/refresh 1회만 호출됨 |
| `clearSession` | /auth/logout 호출 + 양 토큰 + user 무효화 / 네트워크 실패에도 로컬 무효화 진행 |

### 7.3 수동 통합 검증

- [ ] 정상 로그인 → 양 토큰 저장 확인
- [ ] access 만료 시뮬레이션 (15분 대기 또는 강제 만료) → 자동 refresh 후 화면 정상 유지
- [ ] refresh 만료 시뮬레이션 (14일 대기 또는 강제 만료) → /login 으로 이동
- [ ] 동일 refresh 2회 호출 (포스트맨 등) → 두 번째 호출 `REFRESH_REUSE_DETECTED` + 모든 세션 무효화
- [ ] 로그아웃 후 같은 refresh 사용 시도 → 401

### 7.4 완료 기준

- 위 단위 테스트 전부 PASS
- `pnpm --filter @pinch/api typecheck && lint && test` 모두 PASS
- `pnpm --filter @pinch/mobile typecheck && lint && test` 모두 PASS
- 수동 통합 검증 5항목 통과

---

## 8. 작업 단계 (Atomic Commits)

브랜치: `feat/refresh-token-rotation`

### 8.1 Phase A — DB 스키마

| # | 커밋 | 변경 |
|---|---|---|
| A1 | `chore(api): JWT_REFRESH_SECRET / JWT_REFRESH_EXPIRES_IN env` | `.env.example`, `.env` (gitignored) |
| A2 | `feat(api): RefreshToken Prisma 모델 + 마이그레이션` | `schema.prisma`, `prisma/migrations/20260521_refresh_token/` |

### 8.2 Phase B — 백엔드 서비스

| # | 커밋 | 변경 |
|---|---|---|
| B1 | `feat(api): AuthService.refresh / logout + reuse 감지` | `auth.service.ts`, `auth.module.ts` (refresh JwtService 등록) |
| B2 | `feat(api): /auth/refresh + /auth/logout 엔드포인트` | `auth.controller.ts`, `dto/refresh.dto.ts` |
| B3 | `refactor(api): login/signup/oauth 응답에 refreshToken 포함` | `auth.service.ts buildAuthResult` |
| B4 | `chore(api): JWT_EXPIRES_IN 1d → 15m` | `.env.example`, `.env` |
| B5 | `test(api): refresh / logout / reuse 감지 spec` | `auth.refresh.service.spec.ts` |

### 8.3 Phase C — 모바일

| # | 커밋 | 변경 |
|---|---|---|
| C1 | `feat(mobile): refreshToken 저장 + getRefreshToken/setRefreshToken` | `shared/api/apiClient.ts`, `entities/user/api/auth-token.ts`, `index.ts` |
| C2 | `feat(mobile): 401 자동 재시도 + 동시 요청 직렬화` | `shared/api/apiClient.ts` interceptor |
| C3 | `feat(mobile): mutation onSuccess 가 refresh 도 저장` | `useLoginMutation`, `useSignupMutation`, `useKakaoOAuthMutation` |
| C4 | `feat(mobile): clearSession 이 /auth/logout 호출` | `entities/user/model/store.ts` |
| C5 | `test(mobile): interceptor 자동 재시도 + 동시 401 + clearSession logout 호출` | 신규 `__tests__` |

### 8.4 Phase D — 문서 동기화

| # | 커밋 | 변경 |
|---|---|---|
| D1 | `docs(spec): /auth/refresh + /auth/logout 명세 추가` | `.claude/docs/API명세.md` §3.1, §6 |
| D2 | `docs(plan): F-07 진행 결과 검증 노트` | `.claude/plans/02-refresh-token-rotation.md` §10 검증 결과 |

> 각 Phase 마다 typecheck + 해당 영역 test 통과 후 다음으로. Phase 분할로 위험 작업 분산.

---

## 9. 위험 요소 및 가정

| # | 항목 | 영향 | 대응 |
|---|---|---|---|
| R1 | access TTL 단축으로 기존 사용자 잦은 재로그인 | UX 저하 | refresh 자동 회전으로 사용자 인지 안 됨 — 정상 동작 |
| R2 | interceptor 재시도 시 무한 루프 | 서비스 마비 | `original._retried` 플래그로 1회 제한 |
| R3 | 동시 401 다발 시 N 회 refresh 호출 | 백엔드 부하 + race | `refreshPromise` 단일 promise 공유 |
| R4 | refresh token 탈취 시 자동 회전이 정상 사용자로 보임 | 보안 위협 | reuse 감지: revoked 토큰 재사용 시 모든 세션 무효화 |
| R5 | bcrypt hash 검색 비용 (user 당 N 개 token 후보 비교) | DB 부하 | refresh JWT payload 의 `tid` 로 단일 record 만 조회 후 1회 bcrypt — O(1) |
| R6 | db:reset 시 기존 dev 사용자 세션 손실 | dev 흐름 중단 | 1차 출시 전이므로 무관 — 새 시드로 재구축 |
| R7 | jest worker leak 경고 누적 | 신호 무시 | F-07 본 작업에서는 별도 추적 안 함 — 별도 정리 |
| R8 | Web 환경 localStorage 의 refresh token 노출 | XSS 위협 | 현 dev 한정. apps/web 본격 시작 시 HttpOnly cookie 로 전환 (별도 작업) |
| R9 | 작업 범위가 큰 위험 작업 (백엔드+모바일 교차) | 누락 위험 | Phase A~D 로 분할, 각 Phase 마다 게이트 |
| R10 | refresh DTO 의 redirectUri 없는 단순 형태로 인해 CSRF 검토 부재 | 본 작업 한정 무관 (모바일 only) | apps/web 진입 시 origin 검증 추가 |

---

## 10. 후속 작업

| 후속 # | 제목 | 사유 |
|---|---|---|
| F-07.1 | RefreshToken 만료 자동 청소 cron | row 누적 방지 |
| F-07.2 | 디바이스 메타 + 세션 목록 UI | 사용자가 본인 세션 관리 가능하게 |
| F-07.3 | Web 환경 HttpOnly cookie 전환 | XSS 대응 — W1 의존 |
| F-07.4 | rotation grace period (5초 윈도우) | 극단적 race condition 보완 |

---

## 11. 참고 자료

- OAuth 2.0 Refresh Token Rotation: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics
- Auth0 — Refresh Token Rotation Best Practices: https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
- NestJS `@nestjs/jwt` 다중 secret 패턴: https://docs.nestjs.com/security/authentication#refresh-tokens
- 기존 plan: `.claude/plans/01-mobile-login-flow.md`
