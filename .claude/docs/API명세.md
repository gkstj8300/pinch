# PINCH API 명세

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | PINCH API 명세 |
| 버전 | v0.1.0 |
| 작성일 | 2026-05-11 |
| 기반 문서 | .claude/설계서.md, .claude/PINCH_Prompts_Phase1.md, prisma/schema.prisma |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-11 | Claude | 5개 핵심 엔드포인트 초안 정의 (Auth / Job Search / Apply / Check-in / Settlement) |

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

### 3.1 Auth — 핸드폰 OTP 인증

#### `POST /auth/otp/send`

OTP 전송 (NICE/Aligo 등).

**Request:**

```json
{
  "phone": "01012345678"
}
```

**Response (200):**

```json
{
  "data": {
    "issuedAt": "2026-05-11T14:30:00+09:00",
    "expiresIn": 180,
    "challengeId": "ch_a8f3..."
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `429 RATE_LIMITED` (분당 3회 제한)

---

#### `POST /auth/otp/verify`

OTP 검증 → JWT 발급.

**Request:**

```json
{
  "challengeId": "ch_a8f3...",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 3600,
    "user": {
      "id": "42",
      "phone": "01012345678",
      "name": "홍길동",
      "role": "WORKER",
      "isVerified": false
    }
  }
}
```

**Errors:** `401 INVALID_OTP`, `410 OTP_EXPIRED`

---

#### `POST /auth/refresh`

토큰 갱신.

**Request:** `{ "refreshToken": "..." }`
**Response:** Access/Refresh 한 쌍 재발급.

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
| **Slice 1 (현재)** | `POST /matches/apply` |
| Slice 2 | `/jobs/search`, `/jobs/:id`, `/matches/:id/qr`, `/matches/:id/check-in`, `/matches/:id/check-out`, `/matches/:id/approve` |
| Slice 3 | `/auth/*`, `/wallet/*` |

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
