# PINCH API 명세

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | PINCH API 명세 |
| 버전 | v0.3.0 |
| 작성일 | 2026-05-21 |
| 기반 문서 | .claude/설계서.md, .claude/plans/01-mobile-login-flow.md, .claude/plans/02-refresh-token-rotation.md, apps/api/prisma/schema.prisma, apps/api/src/auth/auth.controller.ts, apps/api/src/auth/auth.service.ts |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-11 | — | 5개 핵심 엔드포인트 초안 정의 (Auth / Job Search / Apply / Check-in / Settlement) |
| v0.2.0 | 2026-05-21 | — | §3.1 Auth 전면 재작성 — 핸드폰 OTP(`/auth/otp/send`, `/auth/otp/verify`) 제거. 이메일+비밀번호 자체 인증(`/auth/login`, `/auth/signup`) + 카카오 OAuth(`/auth/oauth/kakao`) + JWT 검증(`/auth/me`) 도입. JWT payload `phone` → `email` 전환. user 응답에서 `phone` 제거, `email`/`name`/`isVerified` 포함. `refreshToken` 은 미발급(F-07 별도). 응답 envelope 미적용(현 컨트롤러 직접 반환). §6 Slice 활성화 일정에 Auth 를 Slice 2 로 끌어올림 (자체/카카오 인증은 NICE/다날 외부 인프라 의존 없음). [기반: plans/01-mobile-login-flow.md v0.2.0] |
| v0.3.0 | 2026-05-21 | — | F-07 적용 — §3.1 에 `POST /auth/refresh` + `POST /auth/logout` 추가. `/auth/login` · `/auth/signup` · `/auth/oauth/kakao` 응답에 `refreshToken` 필드 포함. JWT access 토큰 TTL `1d` → `15m` 단축, refresh 14d. Reuse 감지 정책(REFRESH_REUSE_DETECTED 시 user 의 모든 활성 refresh 무효화) 명시. §6 Slice 활성화 일정에서 `/auth/refresh` 를 Slice 2 로 이동(F-11 OTP 만 Slice 3 잔류). [기반: plans/02-refresh-token-rotation.md v0.1.0] |

---

## 2. 공통 규격

### 2.1 베이스

- **Base URL**: `https://api.pinch.kr` (운영) / `http://localhost:3000` (개발)
- **Content-Type**: `application/json; charset=utf-8`
- **인증**: `Authorization: Bearer <JWT>` (예외: Auth/OTP 엔드포인트)
- **시각 형식**: ISO 8601 KST (`2026-05-11T14:30:00+09:00`)

### 2.2 응답 봉투

성공:

```json
{
  "data": { ... }
}
```

실패:

```json
{
  "error": {
    "code": "CAPACITY_FULL",
    "message": "모집 정원이 마감되었습니다.",
    "details": { /* 선택 */ }
  }
}
```

### 2.3 표준 에러 코드

| HTTP | code | 의미 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 |
| 401 | `UNAUTHENTICATED` | JWT 누락/만료 |
| 401 | `INVALID_QR` | QR 토큰 검증 실패 (TOTP) |
| 403 | `FORBIDDEN` | 권한 없음 |
| 403 | `WORKER_ONLY` / `CLIENT_ONLY` | 역할 불일치 |
| 404 | `NOT_FOUND` | 리소스 미존재 |
| 409 | `CAPACITY_FULL` | 정원 마감 |
| 409 | `ALREADY_APPLIED` | 중복 지원 |
| 409 | `JOB_CLOSED` / `JOB_ALREADY_STARTED` | 상태 불일치 |
| 409 | `INVALID_STATE:<state>` | 상태 전이 불가 (예: `INVALID_STATE:CHECKED_IN`) |
| 422 | `OUT_OF_RANGE` | GPS 거리 초과 |
| 422 | `TOO_EARLY` / `TOO_LATE` | 체크인 시간 윈도우 밖 |
| 429 | `RATE_LIMITED` | 호출 한도 초과 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### 2.4 페이지네이션 (cursor 기반)

위치 기반 조회는 cursor 페이지네이션 사용:

```
GET /jobs/search?lat=...&lng=...&cursor=<opaque>&limit=20
```

응답:

```json
{
  "data": {
    "items": [...],
    "nextCursor": "eyJsYXN0SWQiOiI0MiJ9"
  }
}
```

---

## 3. 엔드포인트 명세

### 3.1 Auth — 이메일+비밀번호 자체 인증 + 카카오 OAuth

워커 모바일 앱 인증. 핸드폰 OTP 는 NICE/다날 외부 인프라가 필요하여 별도 Slice 로 이관 (§13 후속 작업 F-11). 본 Slice 는 이메일 자체 인증과 카카오 OAuth 만 다룬다.

> **응답 envelope 노트**: §2.2 의 `{ data: ... }` envelope 는 v0.2.0 현재 Auth 컨트롤러에는 미적용. 컨트롤러가 객체를 직접 반환한다. (NestJS `ClassSerializerInterceptor` 또는 전역 응답 변환 인터셉터 도입 시 envelope 활성화 — 별도 작업)

#### `POST /auth/signup`

이메일+비밀번호 회원가입 → 가입 직후 JWT 발급(자동 로그인). `role` 은 워커앱 전용이므로 항상 `WORKER` 로 고정.

**Request:**

```json
{
  "email": "newuser@pinch.local",
  "password": "pinch1234!",
  "name": "새워커",
  "termsAgreed": true,
  "marketingConsented": false
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `email` | string | ✓ | RFC IsEmail, MaxLength 255 |
| `password` | string | ✓ | 8~72자 (bcrypt 입력 한계) |
| `name` | string | ✓ | 2~50자, **별명 unique** |
| `termsAgreed` | boolean | ✓ | 만 14세 이상 + 이용약관 동의 모두 충족 시 true |
| `marketingConsented` | boolean | | 선택 동의. 미전송 시 false 취급 |

**Response (201):**

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "201",
    "email": "newuser@pinch.local",
    "name": "새워커",
    "role": "WORKER",
    "isVerified": false
  }
}
```

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 |
| 400 | `TERMS_REQUIRED` | `termsAgreed=false` 로 전송 |
| 409 | `EMAIL_TAKEN` | 동일 이메일 사용자 존재 (Prisma P2002 — `users_email_key`) |
| 409 | `NAME_TAKEN` | 동일 별명 사용자 존재 (Prisma P2002 — `users_name_key`) |

---

#### `POST /auth/login`

이메일+비밀번호 로그인. 이메일 존재 여부 누설을 막기 위해 미존재/비밀번호 불일치 모두 동일한 401 응답.

**Request:**

```json
{
  "email": "worker001@pinch.local",
  "password": "pinch1234!"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "42",
    "email": "worker001@pinch.local",
    "name": "워커001",
    "role": "WORKER",
    "isVerified": false
  }
}
```

> Access 토큰 TTL `JWT_EXPIRES_IN=15m`, Refresh `JWT_REFRESH_EXPIRES_IN=14d`. 만료된 access 는 `/auth/refresh` 로 자동 회전 (모바일 axios interceptor 가 1회 재시도 후 원 요청 replay).

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 |
| 401 | `INVALID_CREDENTIALS` | 이메일 미존재 또는 비밀번호 불일치 (구분하지 않음) |

---

#### `POST /auth/oauth/kakao`

카카오 OAuth 콜백. 모바일이 `expo-auth-session` 으로 받은 인가 코드를 백엔드에 위임 → 카카오 토큰 교환 → 사용자 upsert → JWT 발급.

**Request:**

```json
{
  "code": "kakao-authorization-code",
  "redirectUri": "https://auth.expo.io/@username/pinch-mobile"
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `code` | string | ✓ | MaxLength 255 |
| `redirectUri` | string | ✓ | URL 형식, MaxLength 500. **카카오 콘솔에 등록된 URI 와 동일해야 함** (토큰 교환 시 카카오 측 검증) |

**Response (200):** `/auth/login` 응답과 동일 구조 (`accessToken` + `refreshToken` + `user`). 신규 사용자면 자동 가입 (`oauth_provider='kakao'`, `oauth_id=<카카오 user id>`). 별명 충돌 시 백엔드가 `_1`, `_2` ... 접미어를 부여하여 unique 보장.

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 |
| 409 | `EMAIL_TAKEN_BY_LOCAL` | 같은 이메일이 이미 이메일+비밀번호 가입에 사용 중 |
| 409 | `OAUTH_DUPLICATE` | OAuth 사용자 upsert 중 unique 충돌 (희소) |
| 502 | `KAKAO_API_ERROR` | 카카오 token/userinfo 호출 실패 |

> Expo Go 환경(SDK 53+) 은 `auth.expo.io` 프록시가 deprecated 되어 동적 URI 가 발급되며, 카카오 콘솔은 http(s):// 만 등록 허용 → KOE006. 따라서 카카오 OAuth 는 **EAS Dev Build / Standalone** 에서만 실동작. Expo Go 에서는 모바일이 진입 직전 "준비 중" Alert 로 종료. (모바일: `KakaoLoginButton.tsx`)

---

#### `GET /auth/me`

JWT 검증 + 현재 사용자 컨텍스트 반환. 모바일 부팅 시 자동 로그인 검증 (SecureStore 의 토큰을 `/auth/me` 로 확인).

**Auth:** `Authorization: Bearer <accessToken>`

**Response (200):**

```json
{
  "id": "42",
  "email": "worker001@pinch.local",
  "role": "WORKER"
}
```

> v0.2.0 현재 `/auth/me` 응답은 `id`/`email`/`role` 만 포함 (컨트롤러 명시 반환). 별명/`isVerified` 가 모바일 home 화면에 필요해질 경우 응답 확장 필요 — 별도 작업.

**Errors:** `401 UNAUTHENTICATED` (JWT 누락/만료/위조)

---

#### `POST /auth/refresh`

Refresh token 회전 — 기존 refresh 를 새 (access, refresh) 쌍으로 교환. 이전 refresh 는 즉시 무효화되고, 재사용 시 reuse 감지로 해당 user 의 모든 활성 세션이 일괄 무효화된다.

**Request:**

```json
{ "refreshToken": "eyJhbGciOi..." }
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `refreshToken` | string | ✓ | `JWT_REFRESH_SECRET` 으로 서명된 JWT, MaxLength 500 |

**Response (200):** `/auth/login` 응답과 동일 구조 (`accessToken` + `refreshToken` + `user`).

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 누락/형식 오류 |
| 401 | `INVALID_REFRESH` | JWT 검증 실패(위조/만료) 또는 DB record 미일치 / bcrypt 불일치 / soft-deleted user |
| 401 | `REFRESH_REUSE_DETECTED` | 이미 회전된(또는 logout 된) refresh 가 재사용됨 — 해당 user 의 모든 활성 refresh 가 함께 무효화됨 (탈취 의심) |

> **동작 노트** (`apps/api/src/auth/auth.service.ts`):
> - JWT payload 의 `tid` 로 단일 record 만 조회 → 1회 bcrypt — O(1)
> - 정상 회전 시 트랜잭션 안에서 기존 record `revoked_at`/`rotated_at` 채움 + 새 record 발급 (parent_id 로 회전 체인 추적)
> - reuse 감지는 `revoked_at !== null` 인 record 가 매칭됐을 때 → `revokeAllForUser('REUSE_DETECTED')`

---

#### `POST /auth/logout`

서버측 refresh 무효화. **idempotent** — 검증 실패/미일치/만료 모두 204 (silent 통과).

**Request:**

```json
{ "refreshToken": "eyJhbGciOi..." }
```

**Response:** 204 No Content

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 누락 |

> Access 토큰은 클라이언트가 폐기. 서버측 즉시 무효화(blacklist) 는 후속 작업.
> 모바일의 `clearSession` 은 best-effort 로 `/auth/logout` 을 호출 — 네트워크 실패해도 로컬 토큰 + Zustand user 무효화는 끝까지 수행.

---

#### JWT Payload

```typescript
// apps/api/src/auth/types.ts

// Access token — 일반 요청의 Authorization 헤더에 실리는 JWT
interface JwtPayload {
  sub: string;        // user id (BigInt → string)
  email: string;
  role: 'WORKER' | 'CLIENT' | 'ADMIN';
  iat?: number;
  exp?: number;
}

// Refresh token — /auth/refresh body 에 실리는 별도 JWT (별도 secret)
interface RefreshJwtPayload {
  sub: string;        // user id
  tid: string;        // refresh_tokens.id — DB lookup key
  iat?: number;
  exp?: number;
}
```

> v0.1.0 의 `phone` 필드 → v0.2.0 에서 `email` 로 교체. v0.3.0 에서 RefreshJwtPayload 추가.

---

### 3.2 Job Search — 위치 기반 공고 탐색

#### `GET /jobs/search`

현재 위치 기준 반경 X km 이내 공고 조회.

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `lat` | number | ✓ | 워커 위도 (-90~90) |
| `lng` | number | ✓ | 워커 경도 (-180~180) |
| `radiusM` | number | | 반경(m). 기본 3000, 최대 20000 |
| `category` | string | | 카테고리 필터 |
| `minWage` | number | | 시급 하한 |
| `startAfter` | ISO8601 | | 시작 시간 하한 |
| `cursor` | string | | 이전 응답의 `nextCursor` |
| `limit` | number | | 1~50, 기본 20 |

**Response (200):**

```json
{
  "data": {
    "items": [
      {
        "id": "12",
        "title": "카페 홀 서빙 (1시간)",
        "category": "F&B",
        "address": "서울특별시 중구 세종대로 110",
        "distanceM": 342,
        "latitude": 37.5663,
        "longitude": 126.9779,
        "startAt": "2026-05-11T15:30:00+09:00",
        "endAt": "2026-05-11T16:30:00+09:00",
        "hourlyWage": 12000,
        "estimatedMinutes": 60,
        "estimatedPay": 12000,
        "recruitCount": 1,
        "confirmedCount": 0,
        "checkInRadiusM": 150,
        "status": "OPEN"
      }
    ],
    "nextCursor": null
  }
}
```

**구현 노트:** `ST_DWithin` + `<->` (KNN) 정렬. `prisma.$queryRaw` 사용.

**Errors:** `400 VALIDATION_ERROR` (좌표 범위 위반)

---

#### `GET /jobs/:id`

공고 상세.

**Response (200):** `Job` 객체 전체. (필드는 위 search 응답과 동일 + `description`)

---

### 3.3 Apply — 선착순 지원

#### `POST /matches/apply`

**Request:**

```json
{
  "jobId": 12
}
```

> 인증 시점: `workerId` 는 JWT payload 에서 추출 (Slice 1 PoC 단계에서는 body 로 전달).

**Response (201):**

```json
{
  "data": {
    "id": "789",
    "jobId": "12",
    "workerId": "42",
    "status": "MATCHED",
    "matchedAt": "2026-05-11T14:35:12+09:00"
  }
}
```

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 401 | `UNAUTHENTICATED` | JWT 누락 |
| 403 | `WORKER_ONLY` | CLIENT 가 지원 시도 |
| 404 | `JOB_NOT_FOUND` | 공고 미존재 |
| 409 | `CAPACITY_FULL` | 선착순 패배 |
| 409 | `ALREADY_APPLIED` | 같은 워커 중복 지원 |
| 409 | `JOB_CLOSED` | 이미 마감 |
| 409 | `JOB_ALREADY_STARTED` | 시작 시각 지남 |
| 409 | `SCORE_TOO_LOW` | 핀치 스코어 미달 |
| 409 | `VERIFICATION_REQUIRED` | 본인인증 필요 |

**동시성 설계:** [실행가이드 §6](./실행가이드.md#6-핵심-설계-요약--matchesserviceapply) 참조.

---

### 3.4 Check-in — QR + GPS 출근 인증

#### `GET /matches/:id/qr`

(사업주용) 매칭에 대한 동적 QR 토큰 생성.

**Auth:** 해당 공고의 사업주만 호출 가능.

**Response (200):**

```json
{
  "data": {
    "qrToken": "789.56821234.aBc1dEf2GhI3jKl4",
    "expiresIn": 30,
    "refreshAt": "2026-05-11T15:30:30+09:00"
  }
}
```

**클라이언트 동작:** 30초마다 재호출하여 화면 갱신 (TOTP 윈도우 ±1 step 허용).

---

#### `POST /matches/:id/check-in`

(워커용) QR 스캔 + GPS 좌표 제출 → 체크인.

**Request:**

```json
{
  "qrToken": "789.56821234.aBc1dEf2GhI3jKl4",
  "lat": 37.5664,
  "lng": 126.9778
}
```

**Response (200):**

```json
{
  "data": {
    "id": "789",
    "status": "CHECKED_IN",
    "checkInAt": "2026-05-11T15:29:50+09:00",
    "distanceM": 12
  }
}
```

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 401 | `INVALID_QR` | TOTP 검증 실패 (위조/만료) |
| 403 | `NOT_YOUR_MATCH` | 본인 매칭이 아님 |
| 409 | `INVALID_STATE:<status>` | MATCHED 가 아님 |
| 422 | `OUT_OF_RANGE` | 공고 위치 반경 초과 |
| 422 | `TOO_EARLY` | 시작 60분 이상 전 |
| 422 | `TOO_LATE` | 시작 60분 이상 후 |

**Haversine 검증:** `libs/geo/haversine.ts` (Step 3 의사코드 참조). 허용 반경은 `Job.checkInRadiusM` 사용.

---

#### `POST /matches/:id/check-out`

체크아웃. 응답 구조는 `check-in` 과 동일하며 `status = CHECKED_OUT`.

---

### 3.5 Settlement — 정산 (3.3% 원천세)

#### `POST /matches/:id/approve`

(사업주용) 근무 승인 → 워커 지갑에 자동 정산.

**Auth:** 해당 매칭 공고의 사업주만.

**전제 상태:** `CHECKED_OUT`.

**Response (200):**

```json
{
  "data": {
    "matchId": "789",
    "status": "COMPLETED",
    "workedMinutes": 62,
    "grossAmount": 12400,
    "withholdingTax": 400,
    "netAmount": 12000,
    "taxBreakdown": {
      "incomeTax": 370,
      "localTax": 30
    },
    "creditedAt": "2026-05-11T16:32:00+09:00"
  }
}
```

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 403 | `NOT_APPROVER` | 해당 공고의 사업주가 아님 |
| 409 | `INVALID_STATE:<status>` | CHECKED_OUT 가 아님 |
| 409 | `ALREADY_SETTLED` | 중복 승인 (idempotencyKey 충돌) |

**구현 노트:**
- 한 트랜잭션 안에서 `Match` 스냅샷 + `Transaction` 2건(`EARNING`, `WITHHOLDING`) + `Wallet.balance` 갱신
- `idempotencyKey = settle:<matchId>` 로 중복 차단
- 3.3% 원천세 계산은 `BusinessIncomeStrategy` (10원 단위 절사)

---

#### `POST /wallet/withdrawals`

(워커용) 본인 계좌 출금 신청.

**Request:**

```json
{
  "amount": 50000,
  "bankCode": "088",
  "accountNumber": "1101234567890"
}
```

**Response (202):**

```json
{
  "data": {
    "withdrawalId": "wd_a1b2c3",
    "status": "PENDING",
    "amount": 50000,
    "estimatedSettlementAt": "2026-05-11T18:00:00+09:00"
  }
}
```

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 금액 형식 오류 |
| 409 | `INSUFFICIENT_BALANCE` | 잔액 부족 |
| 422 | `ACCOUNT_NOT_VERIFIED` | 계좌 실명 확인 실패 (PortOne 등) |

---

#### `GET /wallet`

지갑 잔액 + 거래 내역 조회 (cursor 페이지네이션).

**Response (200):**

```json
{
  "data": {
    "balance": 184000,
    "pendingAmount": 12000,
    "totalEarned": 250000,
    "totalWithheld": 8250,
    "totalWithdrawn": 50000,
    "transactions": {
      "items": [
        {
          "id": "tx_001",
          "type": "EARNING",
          "grossAmount": 12400,
          "withholdingTax": 400,
          "netAmount": 12000,
          "balanceAfter": 184000,
          "matchId": "789",
          "createdAt": "2026-05-11T16:32:00+09:00"
        }
      ],
      "nextCursor": null
    }
  }
}
```

---

## 4. 상태 전이 다이어그램 (Match)

```
PENDING ──apply()──▶ MATCHED ──check-in──▶ CHECKED_IN ──check-out──▶ CHECKED_OUT
                       │                                                  │
                       │                                                  │
                       ├─worker cancel──▶ CANCELLED                       │
                       │                                                  │
                       └─no-show after start+60m──▶ NOSHOW                │
                                                                          │
                                                          approve()       ▼
                                                          ───────────▶ COMPLETED
```

**금지 전이 (HTTP 409 `INVALID_STATE`):**

- COMPLETED → 어떤 상태로도 전이 불가
- NOSHOW → 어떤 상태로도 전이 불가
- CANCELLED → 어떤 상태로도 전이 불가

---

## 5. NestJS 모듈 매핑

| 엔드포인트 | 모듈 | 파일 |
|---|---|---|
| `/auth/*` | `AuthModule` | `src/auth/` |
| `/jobs/search`, `/jobs/:id` | `JobsModule` | `src/jobs/` |
| `/matches/*` | `MatchesModule` | `src/matches/` (Slice 1 완성) |
| `/wallet/*` | `WalletModule` | `src/wallet/` |

---

## 6. Slice 별 활성화 일정

| Slice | 활성 엔드포인트 |
|---|---|
| Slice 1 | `POST /matches/apply` |
| **Slice 2 (현재)** | Auth: `/auth/signup`, `/auth/login`, `/auth/oauth/kakao`, `/auth/me`, **`/auth/refresh`**, **`/auth/logout`** · Jobs/Matches: `/jobs/search`, `/jobs/:id`, `/matches/:id/qr`, `/matches/:id/check-in`, `/matches/:id/check-out`, `/matches/:id/approve` |
| Slice 3 | `/auth/otp/*` (F-11 NICE/다날), `/wallet/*` |

> v0.3.0: Refresh Token 회전(F-07) 이 Slice 2 로 합류했다. NICE/다날 본인 인증만 Slice 3 잔류.

---

## 7. Swagger / OpenAPI 생성

NestJS `@nestjs/swagger` 사용 예정. DTO 에 `@ApiProperty()` 데코레이터를 추가하면 `/docs` 경로에 자동 노출.

```typescript
// src/main.ts (Slice 2 이후 활성화)
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('PINCH API')
  .setVersion('0.1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```
