# 모바일 로그인 흐름 구현 계획

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 모바일 로그인 흐름 구현 계획 |
| 버전 | v0.2.0 |
| 작성일 | 2026-05-13 |
| 기반 문서 | .claude/docs/API명세.md, .claude/설계서.md, .claude/rules/frontend-architecture.md, .claude/rules/code-organization.md, .claude/rules/test-guide.md, .claude/rules/frontend-coding-rules.md, .claude/rules/contributing-role.md, .claude/images/로그인.png, .claude/images/이메일로 로그인.png, .claude/images/이메일로 회원가입_1.png, .claude/images/이메일로 회원가입_2.png, apps/api/prisma/schema.prisma, apps/api/src/auth/auth.controller.ts, apps/mobile/src/shared/api/apiClient.ts |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-13 | Claude | 신규 작성 — Worker Mobile 로그인(전화번호 입력 + 자동 로그인 토큰 저장) 구현 계획 정의 |
| v0.2.0 | 2026-05-13 | Claude | 인증 방식 전면 변경 — 핸드폰 OTP 제거, 이메일+비밀번호 자체 인증 + 카카오 OAuth(소셜 4종 UI 노출, 카카오만 실동작) 도입. 이메일 회원가입 2단계 화면 추가. User 스키마에서 phone 컬럼 제거 + email/password_hash 추가. db:reset 후 새 시드로 완전 재구축 결정. 화면 트리/FSD 구조/작업 단계 전면 재작성 |

---

## 2. 개요 및 배경

### 2.1 목적

워커 모바일 앱(`apps/mobile`)의 인증 흐름을 **이메일+비밀번호 자체 로그인**과 **카카오 OAuth 소셜 로그인**으로 구축한다. 본 작업은 인증 도메인의 백엔드 스키마·엔드포인트·시드를 모두 갈아엎고, 모바일에 5개 화면(splash·메인 로그인·이메일 로그인·이메일 회원가입·홈)을 신설하는 **수직 슬라이스 재구축** 작업이다.

### 2.2 v0.1.0 → v0.2.0 방향 전환 사유

- 설계서 §3.1의 핸드폰 OTP 인증은 NICE/다날 외부 인프라 의존(Slice 3)이라 단기 진행 불가
- `.claude/images/로그인.png` 디자인 자산이 소셜 로그인 기반(카카오/Apple/네이버/페이스북) + 이메일 로그인 보조 패턴을 채택
- 사업주 진입점은 `apps/web` 별도이므로 본 워커 앱 화면에서 사업주 분기 UI 제거

### 2.3 현재 상태 (작업 시작 시점)

- `apps/api/src/auth/*` — `POST /auth/dev-login`(phone 기반, OTP 없음), `GET /auth/me`(JWT 검증) 구현됨. JWT payload에 phone 포함
- `apps/api/prisma/schema.prisma` — `User.phone` unique. email은 nullable
- `apps/api/prisma/seed.ts` — 사업주1 + 워커200명 (`0101000XXXX` 패턴) 시드
- `apps/api/prisma/migrations/post-init.sql` — `users_active_phone_idx` 부분 인덱스
- `apps/mobile/src/app/{_layout,index}.tsx` — Provider 래핑 + PINCH placeholder 화면
- `apps/mobile/src/shared/api/apiClient.ts` — axios + SecureStore JWT 자동 주입 완료
- `apps/mobile/src/entities/user/model/store.ts` — AuthUser(phone 포함) Zustand 스토어
- `k6/apply-stress.js` — phone 기반 dev-login으로 200 VU 부하 테스트

### 2.4 본 작업의 범위 (포함)

- ✅ **백엔드 인증 도메인 재설계** — 스키마·DTO·서비스·컨트롤러·JWT payload 전면 교체
- ✅ **이메일+비밀번호 자체 인증** — `POST /auth/login`, `POST /auth/signup` 신설. bcrypt 해시
- ✅ **카카오 OAuth 백엔드 콜백** — `POST /auth/oauth/kakao` 신설. expo-auth-session으로부터 인가 코드 수신 → 카카오 토큰 교환 → 사용자 upsert → JWT 발급
- ✅ **모바일 화면 5종** — splash / 메인 로그인 / 이메일 로그인 / 이메일 회원가입 / 홈
- ✅ **소셜 4종 UI 노출** — 카카오/Apple/네이버/페이스북 버튼. 카카오만 실동작, 나머지 3종은 클릭 시 "준비 중" 안내 + disabled 스타일
- ✅ **자동 로그인** — SecureStore 토큰 → `/auth/me` 검증 → home 자동 진입
- ✅ **DB 완전 재구축** — `prisma migrate reset --force` + 새 시드로 완전 갈아엎기
- ✅ **시드 재작성** — 이메일 패턴(`worker001@pinch.local`, `client@pinch.local`) + bcrypt 해시된 기본 비밀번호
- ✅ **단위 테스트** — bcrypt 검증, JWT 발급, 카카오 OAuth 콜백 mocking, 모바일 폼 검증

### 2.5 본 작업에서 제외 (별도 후속 작업)

| 제외 항목 | 사유 | 후속 작업 트래커 |
|---|---|---|
| 핸드폰 OTP 인증 | NICE/다날 외부 인프라 대기 (Slice 3) | 향후 Slice 3 재개 시 |
| Apple/네이버/페이스북 OAuth 실동작 | 외부 인프라 미준비 | 키 발급 후 별도 PR |
| 이메일 본인 인증 (메일 발송) | SMTP 인프라 미준비 | UI는 "이메일 인증하기" 버튼만 노출, dev 환경에서는 항상 통과로 stub |
| 추천 코드 등록 | 별도 referral 도메인 | UI는 입력란만 노출, 백엔드 무시 |
| 비밀번호 재설정 | 메일 발송 의존 | 별도 작업 |
| Refresh Token 회전 | `/auth/refresh` 미구현 | 별도 작업 |
| k6 부하 테스트 갱신 | dev-login → email 로그인 전환 회귀 | 별도 회귀 작업 |
| 약관 상세 화면 (이용약관/개인정보) | 콘텐츠 미확정 | 콘텐츠 확정 후 별도 작업 |
| 비밀번호 정책 강화 (대소문자·특수문자) | 1차 출시 단순화 | 정책 확정 후 별도 작업 |

### 2.6 단순화 결정 (v0.2.0)

| 항목 | 결정 | 사유 |
|---|---|---|
| "인테리어 전문가이시다면 >" 우상단 링크 | **제거** | 사업주는 `apps/web` 별도 |
| "이메일 인증하기" 버튼 | UI 노출, 클릭 시 dev 환경에서 자동 통과 stub | SMTP 인프라 없이 흐름 검증 가능 |
| 약관 동의 컬럼 | `terms_agreed_at`만 신설 (필수 동의 시점). 마케팅 동의는 `marketing_consented_at` nullable | 최소 컬럼만, 추가는 별도 마이그레이션 |
| 약관 화면 ">" 진입 | 본 작업에서는 비활성 처리 (체크박스만 동작) | 약관 콘텐츠 확정 후 |
| 별명 중복 검사 | 백엔드 `User.name`을 unique로 변경 + 회원가입 시 검증 | 디자인 명시 사항 |

---

## 3. 화면 구성

### 3.1 라우트 트리

```
src/app/
├── _layout.tsx                    (Stack + Provider, 변경 없음)
├── index.tsx                      ★ Splash redirect (자동 로그인 분기)
├── home.tsx                       ★ 로그인 후 진입 (사용자 정보 + 로그아웃)
├── login/
│   ├── _layout.tsx                Stack (헤더 표시)
│   ├── index.tsx                  ★ 메인 로그인 (소셜 4종 + 이메일 링크)
│   └── email.tsx                  ★ 이메일+비밀번호 로그인
└── signup/
    ├── _layout.tsx                Stack
    └── email.tsx                  ★ 이메일 회원가입 (단일 페이지, 디자인 이미지 그대로)
```

### 3.2 화면별 상세

#### 3.2.1 `/` (Splash / Redirect)

| 항목 | 내용 |
|---|---|
| UI | `bg-background-primary` + 화면 중앙 `ActivityIndicator` (PINCH 로고는 다음 단계 작업) |
| 로직 | mount 즉시 `useMeQuery` 발화 → settled 시 `router.replace`로 분기 |
| 분기 | 200 OK → `/home` / 401·네트워크 실패·토큰 없음 → `/login` |

#### 3.2.2 `/login` (메인 로그인)

`로그인.png` 패턴 기반.

| 영역 | 내용 |
|---|---|
| 헤더 | 좌상단 X 닫기 버튼 (스택 뒤로가기) |
| 브랜드 | 중앙 PINCH 로고 + 식별 텍스트 |
| 강조 말풍선 | "3초만에 빠른 회원가입" (PINCH Pink 톤) |
| 1순위 CTA | "카카오톡으로 계속하기" (카카오 노란색 #FEE500, 검은 텍스트) — 실동작 |
| 2순위 CTA | "Apple로 계속하기" (검은색) — disabled, 클릭 시 "준비 중" 토스트/Alert |
| 보조 소셜 | 네이버(녹색 원형), 페이스북(파란색 원형) — disabled, 클릭 시 "준비 중" |
| 텍스트 링크 | "이메일로 로그인" / "이메일로 회원가입" (구분자 `|`) — 각각 `/login/email`, `/signup/email` |
| 푸터 | "로그인에 문제가 있으신가요?" (회색, 본 작업에서는 동작 없음) |

#### 3.2.3 `/login/email` (이메일 로그인)

`이메일로 로그인.png` 그대로.

| 영역 | 내용 |
|---|---|
| 헤더 | ← 뒤로가기 + 타이틀 "이메일로 로그인" |
| 입력 | 이메일 (keyboardType email-address) / 비밀번호 (secureTextEntry) |
| CTA | "로그인하기" — 두 필드 검증 통과 전 disabled (회색), 통과 시 PINCH Pink |
| 보조 | "비밀번호 재설정" (본 작업에서는 비활성) |
| 에러 | 폼 하단 인라인 텍스트 (`text-support-error`) |

#### 3.2.4 `/signup/email` (이메일 회원가입)

`이메일로 회원가입_1.png` + `_2.png` 단일 폼 (스크롤).

| 영역 | 내용 |
|---|---|
| 헤더 | ← 뒤로가기 + 타이틀 "이메일로 회원가입". **우상단 사업주 링크 제거** |
| 입력 | 이메일 / "이메일 인증하기"(dev stub) / 비밀번호 / 비밀번호 확인 / 별명(중복 불가) |
| 약관 | 전체동의 토글 / 만 14세 이상(필수) / 이용약관(필수) / 개인정보 마케팅(선택) / 이벤트 수신(선택) |
| 추천코드 | 입력 + "확인" 버튼 — UI만 (백엔드 무시) |
| 하단 고정 | "회원가입 완료" 버튼 — 모든 필수 충족 전 disabled |

#### 3.2.5 `/home`

| 영역 | 내용 |
|---|---|
| UI | 기존 PINCH placeholder + 사용자 email/role/name 표시 |
| 로그아웃 버튼 | `setAccessToken(null)` + `clearUser()` + `queryClient.removeQueries(['auth','me'])` + `router.replace('/login')` |
| 보호 | mount 시 `useAuthStore.user` null 또는 토큰 무효면 즉시 `/login` redirect |

---

## 4. 백엔드 변경 (apps/api)

### 4.1 DB 스키마 변경 — 새 마이그레이션 추가

`prisma/migrations/20260513_email_auth/migration.sql` (신규 마이그레이션, 기존 init 파일 수정 금지).

```sql
-- 1) 새 컬럼 추가
ALTER TABLE users
  ADD COLUMN email VARCHAR(255) NOT NULL,
  ADD COLUMN password_hash VARCHAR(255),
  ADD COLUMN oauth_provider VARCHAR(20),
  ADD COLUMN oauth_id VARCHAR(100),
  ADD COLUMN terms_agreed_at TIMESTAMPTZ(6),
  ADD COLUMN marketing_consented_at TIMESTAMPTZ(6);

-- 2) phone 컬럼 제거
ALTER TABLE users DROP COLUMN phone;

-- 3) 유니크 제약
CREATE UNIQUE INDEX users_email_key ON users(email);
CREATE UNIQUE INDEX users_oauth_key ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- 4) 별명(name) unique
CREATE UNIQUE INDEX users_name_key ON users(name) WHERE deleted_at IS NULL;

-- 5) password_hash 또는 oauth_provider 중 하나는 반드시 존재 (CHECK)
ALTER TABLE users ADD CONSTRAINT users_auth_method_check
  CHECK (password_hash IS NOT NULL OR oauth_provider IS NOT NULL);
```

> **db:reset 결정에 따라 위 마이그레이션은 단순화 가능** — Prisma가 모델 정의에서 자동 생성한 단일 마이그레이션으로 갈음하고, `prisma migrate reset --force`로 빈 DB에서 재구축한다. CHECK 제약은 `post-init.sql`에서 추가.

### 4.2 schema.prisma User 모델 갱신

```prisma
model User {
  id                  BigInt              @id @default(autoincrement())
  email               String              @unique @db.VarChar(255)
  passwordHash        String?             @map("password_hash") @db.VarChar(255)
  oauthProvider       String?             @map("oauth_provider") @db.VarChar(20)
  oauthId             String?             @map("oauth_id") @db.VarChar(100)

  name                String              @db.VarChar(50)            // 별명 (unique)
  profileImg          String?             @map("profile_img")
  role                UserRole

  // 본인인증 (Slice 3 NICE/다날) — 그대로 유지
  isVerified          Boolean             @default(false) @map("is_verified")
  verificationStatus  VerificationStatus  @default(UNVERIFIED) @map("verification_status")
  ciHash              String?             @unique @map("ci_hash") @db.Char(88)
  diHash              String?             @map("di_hash") @db.Char(88)
  verifiedAt          DateTime?           @map("verified_at") @db.Timestamptz(6)

  // 약관/동의
  termsAgreedAt          DateTime?        @map("terms_agreed_at") @db.Timestamptz(6)
  marketingConsentedAt   DateTime?        @map("marketing_consented_at") @db.Timestamptz(6)

  // Pinch Score (그대로 유지)
  pinchScore          Int                 @default(1000) @map("pinch_score")
  ratingAvg           Decimal             @default(0) @db.Decimal(3, 2) @map("rating_avg")
  totalReviews        Int                 @default(0) @map("total_reviews")
  completedCount      Int                 @default(0) @map("completed_count")
  noshowCount         Int                 @default(0) @map("noshow_count")
  lateCount           Int                 @default(0) @map("late_count")
  cancelCount         Int                 @default(0) @map("cancel_count")

  jobsCreated         Job[]               @relation("ClientJobs")
  matches             Match[]             @relation("WorkerMatches")
  wallet              Wallet?
  reviewsWritten      Review[]            @relation("ReviewWriter")
  reviewsReceived     Review[]            @relation("ReviewTarget")

  createdAt           DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime            @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt           DateTime?           @map("deleted_at") @db.Timestamptz(6)

  @@unique([oauthProvider, oauthId], map: "users_oauth_key")
  @@index([role, deletedAt])
  @@index([pinchScore(sort: Desc)])
  @@map("users")
}
```

### 4.3 post-init.sql 갱신

```sql
-- 변경: 기존 users_active_phone_idx 제거 → users_active_email_idx 추가
DROP INDEX IF EXISTS users_active_phone_idx;
CREATE INDEX IF NOT EXISTS users_active_email_idx
  ON users(email) WHERE deleted_at IS NULL;

-- 신규: 인증 방식 CHECK
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_method_check;
ALTER TABLE users ADD CONSTRAINT users_auth_method_check
  CHECK (password_hash IS NOT NULL OR oauth_provider IS NOT NULL);
```

### 4.4 시드 재작성 (`prisma/seed.ts`)

| 사용자 유형 | 이메일 패턴 | 비밀번호 (평문, 시드용) | 비고 |
|---|---|---|---|
| 사업주 1명 | `client@pinch.local` | `pinch1234!` | name: "테스트사업주" |
| 워커 200명 | `worker001@pinch.local` ~ `worker200@pinch.local` | `pinch1234!` | name: "워커001" ~ "워커200" |

bcrypt 해시는 시드 실행 시 1회 계산 후 모든 워커가 동일 해시 공유 (개발 단순성 + 시드 시간 단축).

### 4.5 엔드포인트 변경

| 기존 | 변경 후 |
|---|---|
| `POST /auth/dev-login` (phone) | **삭제** |
| (없음) | `POST /auth/login` — `{ email, password }` → `{ accessToken, user }` |
| (없음) | `POST /auth/signup` — `{ email, password, name, termsAgreed, marketingConsented }` → `{ accessToken, user }` |
| (없음) | `POST /auth/oauth/kakao` — `{ code, redirectUri }` → `{ accessToken, user }` |
| `GET /auth/me` | 유지. 응답에서 `phone` 필드 제거, `email`·`name`·`role`·`isVerified` 포함 |

### 4.6 JWT payload 변경

```typescript
// types.ts
export interface JwtPayload {
  sub: string;        // user id (BigInt stringified)
  email: string;      // ← phone에서 변경
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface CurrentUserContext {
  id: bigint;
  email: string;      // ← 변경
  role: UserRole;
}
```

### 4.7 카카오 OAuth 백엔드 (`POST /auth/oauth/kakao`)

```
expo-auth-session (mobile)
  └─ user 카카오 로그인 → 인가 코드 수령
       └─ POST /auth/oauth/kakao { code, redirectUri }
            └─ 백엔드: KakaoOAuthService.exchangeCode(code)
                 ├─ POST https://kauth.kakao.com/oauth/token
                 │   { grant_type: 'authorization_code', client_id: KAKAO_REST_API_KEY, redirect_uri, code }
                 ├─ → kakao_access_token 수령
                 ├─ GET https://kapi.kakao.com/v2/user/me
                 │   Authorization: Bearer kakao_access_token
                 └─ → kakao user info { id, kakao_account.email, properties.nickname }
            └─ User upsert (oauth_provider='kakao', oauth_id=kakao_user_id, email=kakao_email)
            └─ JWT 발급 → 응답
```

### 4.8 새 의존성

| 패키지 | 용도 |
|---|---|
| `bcrypt` | 비밀번호 해시/검증 |
| `@types/bcrypt` (dev) | 타입 |
| (axios는 백엔드에 없으므로 `fetch` 사용 또는 `@nestjs/axios` 도입 검토) | 카카오 API 호출 |

> 백엔드에 axios가 없는 상태이므로 `node:undici` 또는 글로벌 `fetch`(Node 18+) 사용. 별도 의존성 추가 없이 처리.

### 4.9 환경변수 추가

`apps/api/.env.example`:

```dotenv
# Kakao OAuth (개발용 placeholder — 실제 키는 .env에만)
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=https://auth.expo.io/@your-expo-username/pinch-mobile
```

`apps/api/.env` (gitignore됨):

```dotenv
KAKAO_REST_API_KEY=70d8db6c99799796a660966c718f3d6d
KAKAO_REDIRECT_URI=https://auth.expo.io/@<expo-username>/pinch-mobile
```

> Expo Go 환경에서는 expo-auth-session이 `https://auth.expo.io/@{username}/{slug}` 프록시를 사용. 사용자명 확정 필요. Standalone(EAS) 빌드 시 `pinch://oauth/kakao`로 변경.

---

## 5. 모바일 변경 (apps/mobile)

### 5.1 FSD 구조

```
src/
├── app/
│   ├── _layout.tsx                (변경 없음)
│   ├── index.tsx                  ★ Splash
│   ├── home.tsx                   ★ Home
│   ├── login/
│   │   ├── _layout.tsx            ★ 헤더 있는 Stack
│   │   ├── index.tsx              ★ 메인 로그인
│   │   └── email.tsx              ★ 이메일 로그인
│   └── signup/
│       ├── _layout.tsx            ★
│       └── email.tsx              ★ 이메일 회원가입
├── features/
│   ├── email-login/               ★ 신규 slice
│   │   ├── api/useLoginMutation.ts
│   │   ├── lib/validateLoginForm.ts
│   │   ├── ui/EmailLoginForm.tsx
│   │   └── index.ts
│   ├── email-signup/              ★ 신규 slice
│   │   ├── api/useSignupMutation.ts
│   │   ├── lib/validateSignupForm.ts
│   │   ├── ui/
│   │   │   ├── SignupForm.tsx
│   │   │   └── TermsAgreementGroup.tsx
│   │   └── index.ts
│   └── kakao-oauth/               ★ 신규 slice
│       ├── api/useKakaoOAuthMutation.ts
│       ├── lib/buildAuthRequest.ts
│       ├── ui/KakaoLoginButton.tsx
│       └── index.ts
├── entities/
│   └── user/
│       ├── api/
│       │   ├── useMeQuery.ts                  ★ 신규
│       │   ├── auth-token.ts                  ★ 신규 (apiClient 래퍼)
│       │   └── index.ts
│       ├── model/
│       │   ├── store.ts                       ★ 확장 (AuthUser email)
│       │   └── types.ts                       ★ 확장
│       └── index.ts
└── shared/
    ├── api/                       (변경 없음)
    ├── config/                    (변경 없음)
    └── ui/                        ★ 신규 — 최소 컴포넌트만
        ├── TextInput.tsx          (NativeWind + 디자인 토큰)
        ├── Button.tsx             (variant: primary/secondary/disabled/kakao)
        ├── Checkbox.tsx
        └── index.ts
```

### 5.2 의존 방향 (FSD 단방향 검증)

```
app/login/index.tsx       → features/{kakao-oauth, email-login(링크)} → entities/user → shared/{api, ui}
app/login/email.tsx       → features/email-login                       → entities/user → shared/{api, ui}
app/signup/email.tsx      → features/email-signup                      → entities/user → shared/{api, ui}
app/index.tsx             → entities/user                              → shared/api
app/home.tsx              → entities/user                              → shared/{api, ui}
```

- features 간 import 없음
- `kakao-oauth`는 `expo-auth-session` + `expo-web-browser` 직접 사용 (shared로 추상화 안 함 — 단일 사용처)

### 5.3 Public API (index.ts 배럴)

| Slice | export |
|---|---|
| `features/email-login` | `EmailLoginForm`, `useLoginMutation` |
| `features/email-signup` | `SignupForm`, `useSignupMutation` |
| `features/kakao-oauth` | `KakaoLoginButton`, `useKakaoOAuthMutation` |
| `entities/user` | `useAuthStore`, `useMeQuery`, `clearSession`, `AuthUser`, `UserRole` |
| `shared/ui` | `TextInput`, `Button`, `Checkbox` |

### 5.4 신규 모바일 의존성

| 패키지 | 용도 |
|---|---|
| `expo-auth-session` | 카카오 OAuth 인가 코드 수령 |
| `expo-web-browser` | OAuth 화면 렌더링 (expo-auth-session 의존) |

`pnpm --filter @pinch/mobile expo install expo-auth-session expo-web-browser`로 Expo SDK 호환 버전 설치.

---

## 6. 자동 로그인 흐름

```
[App 시작]
    │
    ▼
app/_layout.tsx (Provider 래핑)
    │
    ▼
app/index.tsx (Splash) mount
    │
    ▼
useMeQuery() 호출
  ├─ SecureStore.getItemAsync('pinch.accessToken')
  ├─ 토큰 없음 ──► useMeQuery skip ──► router.replace('/login')
  └─ 토큰 있음 ──► GET /auth/me (apiClient interceptor가 Bearer 자동 주입)
                     │
           ┌─────────┴─────────┐
         200 OK              401 / 네트워크 실패
           │                   │
           ▼                   ▼
     useAuthStore.setUser   apiClient interceptor가 토큰 자동 삭제
           │                + onError에서 useAuthStore.clearUser()
           ▼                   │
     router.replace('/home')   ▼
                          router.replace('/login')
```

---

## 7. API 계약

### 7.1 `POST /auth/login`

**Request:**
```json
{ "email": "worker001@pinch.local", "password": "pinch1234!" }
```

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "42",
    "email": "worker001@pinch.local",
    "name": "워커001",
    "role": "WORKER",
    "isVerified": false
  }
}
```

**Errors:** `400 VALIDATION_ERROR` / `401 INVALID_CREDENTIALS` / `404 USER_NOT_FOUND`

### 7.2 `POST /auth/signup`

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

**Response (201):** `/auth/login` 응답과 동일 (가입 직후 자동 로그인)

**Errors:** `400 VALIDATION_ERROR` / `409 EMAIL_TAKEN` / `409 NAME_TAKEN` / `400 TERMS_REQUIRED`

### 7.3 `POST /auth/oauth/kakao`

**Request:**
```json
{
  "code": "kakao-authorization-code",
  "redirectUri": "https://auth.expo.io/@username/pinch-mobile"
}
```

**Response (200/201):** `/auth/login` 응답과 동일. 신규 사용자면 자동 가입 (oauth_provider='kakao')

**Errors:** `400 INVALID_CODE` / `502 KAKAO_API_ERROR` / `409 EMAIL_TAKEN_BY_LOCAL` (같은 이메일이 이미 password 가입돼 있는 경우)

### 7.4 `GET /auth/me`

**Response (200):**
```json
{
  "id": "42",
  "email": "worker001@pinch.local",
  "name": "워커001",
  "role": "WORKER"
}
```

**Errors:** `401 UNAUTHENTICATED`

---

## 8. 상수·타입 배치

`.claude/rules/code-organization.md` 적용.

| 상수/타입 | 배치 |
|---|---|
| `BCRYPT_SALT_ROUNDS = 10` | `apps/api/src/auth/auth.service.ts` 내부 (단일 사용) |
| `KAKAO_TOKEN_URL`, `KAKAO_USER_URL` | `apps/api/src/auth/kakao-oauth.service.ts` 내부 |
| `EMAIL_REGEX` | `apps/mobile/src/features/email-login/lib/validateLoginForm.ts` + `email-signup/lib/validateSignupForm.ts` 양쪽 동일 → 추후 동일 값 2곳 이상 → `shared/lib/validators.ts` 승격 |
| `PASSWORD_MIN_LENGTH = 8` | 위와 동일 |
| `LoginRequest`/`LoginResponse` 타입 | `features/email-login/api/useLoginMutation.ts` (단일 사용처) |
| `SignupRequest`/`SignupResponse` 타입 | `features/email-signup/api/useSignupMutation.ts` |
| `KakaoOAuthRequest`/`KakaoOAuthResponse` | `features/kakao-oauth/api/useKakaoOAuthMutation.ts` |
| `AuthUser` 타입 | `entities/user/model/types.ts` |

> `packages/api-types` 도입 시 위 Request/Response 전부 이전.

---

## 9. 테스트 계획

`.claude/rules/test-guide.md` 적용.

### 9.1 백엔드 단위 테스트

| 대상 | 파일 | 검증 |
|---|---|---|
| `AuthService.signup` | `auth.service.spec.ts` | bcrypt 해시 저장 / 이메일 중복 시 409 / 약관 미동의 시 400 / 별명 중복 시 409 |
| `AuthService.login` | 동일 | 비밀번호 일치 시 JWT 발급 / 불일치 시 401 / 미존재 사용자 401 (이메일 enumeration 방지) |
| `KakaoOAuthService.exchangeCode` | `kakao-oauth.service.spec.ts` | 카카오 API mock — 정상 응답 시 user upsert / 실패 시 502 |
| `JwtStrategy.validate` | `jwt.strategy.spec.ts` | payload email로 사용자 조회 / soft-delete 사용자 401 |

### 9.2 모바일 단위 테스트

| 대상 | 파일 | 검증 |
|---|---|---|
| `validateLoginForm` | `features/email-login/lib/validateLoginForm.spec.ts` | 정상 / 이메일 형식 오류 / 비밀번호 길이 미달 |
| `validateSignupForm` | `features/email-signup/lib/validateSignupForm.spec.ts` | 비밀번호-확인 불일치 / 별명 빈값 / 약관 미체크 |
| `useLoginMutation` | `features/email-login/api/useLoginMutation.spec.ts` | 200 시 SecureStore 저장 + setUser / 401 시 에러 / 네트워크 실패 |
| `useMeQuery` | `entities/user/api/useMeQuery.spec.ts` | 토큰 없을 때 skip / 200 시 setUser / 401 시 clearUser |

### 9.3 수동 통합 검증 시나리오

- [ ] **신규 회원가입** — 이메일/비밀번호/별명/필수 약관 입력 → 가입 → 자동 로그인 → home 진입
- [ ] **이메일 중복 가입 시도** — 409 에러 표시
- [ ] **별명 중복 가입 시도** — 409 에러 표시
- [ ] **약관 미동의 시 가입 버튼 disabled** — 클릭 불가
- [ ] **이메일 로그인 (시드 사용자)** — `worker001@pinch.local / pinch1234!` 로그인 성공 → home 진입
- [ ] **잘못된 비밀번호** — 401 에러 표시
- [ ] **카카오 로그인** — 카카오 인가 화면 → 동의 → home 진입 (신규 시 자동 가입)
- [ ] **준비 중 소셜 (Apple/네이버/페이스북) 클릭** — "준비 중" 안내 표시, 로그인 진행 안 됨
- [ ] **자동 로그인** — 로그인 후 앱 강제 종료 → 재시작 시 home 자동 진입
- [ ] **로그아웃** — home에서 로그아웃 → SecureStore 비워짐 + login으로 복귀
- [ ] **토큰 무효 시뮬레이션** — SecureStore에 잘못된 토큰 주입 → 재시작 시 401 → 토큰 자동 삭제 + login 복귀
- [ ] **네트워크 차단 로그인** — 인라인 에러 표시, 토큰 미저장

### 9.4 완료 기준

- 위 단위 테스트 전부 PASS
- 수동 검증 12항목 전부 통과 (Android 또는 web 둘 중 하나에서 검증, web은 SecureStore 미동작이므로 자동 로그인은 Android 전용 검증)
- `pnpm --filter @pinch/api typecheck` PASS
- `pnpm --filter @pinch/api lint` PASS
- `pnpm --filter @pinch/mobile typecheck` PASS
- `pnpm --filter @pinch/mobile lint` PASS
- `pnpm --filter @pinch/api test` PASS

---

## 10. 작업 단계 (Atomic Commits)

브랜치: `feat/email-kakao-auth-flow`

### 10.1 Phase A — 백엔드 인증 도메인 재설계

| # | 커밋 | 변경 |
|---|---|---|
| A1 | `chore(api): bcrypt 의존성 추가` | `apps/api/package.json` |
| A2 | `feat(api): User 스키마를 email/password_hash/oauth 기반으로 전환` | `prisma/schema.prisma`, 새 마이그레이션 디렉토리 |
| A3 | `feat(api): post-init.sql 인덱스/CHECK 제약 갱신` | `prisma/migrations/post-init.sql` |
| A4 | `feat(api): 시드 재작성 — email/bcrypt 패턴` | `prisma/seed.ts` |
| A5 | `feat(api): /auth/login + /auth/signup 엔드포인트 신설, dev-login 제거` | `src/auth/{auth.controller,auth.service,dto}` |
| A6 | `refactor(api): JWT payload phone → email 전환` | `src/auth/{jwt.strategy,types}.ts` |
| A7 | `test(api): auth 단위 테스트 (login/signup/JwtStrategy)` | `*.spec.ts` |

### 10.2 Phase B — 카카오 OAuth 백엔드

| # | 커밋 | 변경 |
|---|---|---|
| B1 | `feat(api): KakaoOAuthService + /auth/oauth/kakao 엔드포인트` | `src/auth/kakao-oauth.service.ts`, controller |
| B2 | `chore(api): KAKAO_REST_API_KEY 환경변수 + .env.example placeholder` | `.env.example` |
| B3 | `test(api): KakaoOAuthService mock 테스트` | `kakao-oauth.service.spec.ts` |

### 10.3 Phase C — 모바일 entities/shared 기반 확장

| # | 커밋 | 변경 |
|---|---|---|
| C1 | `feat(mobile): entities/user에 useMeQuery + auth-token + AuthUser email 확장` | `entities/user/api/*`, `model/{store,types}.ts`, `index.ts` |
| C2 | `feat(mobile): shared/ui — TextInput/Button/Checkbox 최소 컴포넌트` | `shared/ui/**` |

### 10.4 Phase D — 모바일 features slice 신설

| # | 커밋 | 변경 |
|---|---|---|
| D1 | `feat(mobile): features/email-login slice` | `features/email-login/**` |
| D2 | `feat(mobile): features/email-signup slice` | `features/email-signup/**` |
| D3 | `feat(mobile): features/kakao-oauth slice (expo-auth-session)` | `features/kakao-oauth/**`, `package.json` |

### 10.5 Phase E — 모바일 라우트/페이지

| # | 커밋 | 변경 |
|---|---|---|
| E1 | `refactor(mobile): home placeholder를 src/app/home.tsx로 분리` | `src/app/home.tsx` |
| E2 | `feat(mobile): /login + /login/email + /signup/email 페이지` | `src/app/login/**`, `src/app/signup/**` |
| E3 | `feat(mobile): / splash redirect 구현` | `src/app/index.tsx` |

### 10.6 Phase F — 통합 테스트 및 검증

| # | 커밋 | 변경 |
|---|---|---|
| F1 | `test(mobile): 로그인/회원가입/카카오 OAuth 단위 테스트` | `**/*.spec.ts(x)` + jest 설정 |
| F2 | `docs: 설계서 §3.1 + API 명세 §3.1 동기화` | `.claude/설계서.md`, `.claude/docs/API명세.md` |
| F3 | `chore: db:reset + 신규 시드 검증 노트` | `.claude/plans/01-mobile-login-flow.md` 검증 결과 추가 |

> 각 커밋마다 `typecheck` + 해당 영역 단위 테스트 통과해야 다음 커밋으로 진행. 작업단위 가이드라인(`.claude/rules/frontend-coding-rules.md` §11)의 위험 작업 분할 원칙 준수.

---

## 11. 위험 요소 및 가정

| # | 항목 | 영향 | 대응 |
|---|---|---|---|
| R1 | db:reset으로 Slice 1·2 검증 데이터 소실 | 회귀 테스트 시 재시드 필요 | 새 시드도 200명 워커 + 사업주 1명 유지 → k6 부하 테스트는 별도 회귀 작업에서 email 기반으로 갱신 |
| R2 | 카카오 Redirect URI는 Expo 사용자명에 의존 | Expo Go 환경에서 사용자별로 URI가 다름 | `.env.example`에 placeholder, 실제 URI는 사용자 콘솔 등록 필요. EAS 빌드 시 `pinch://oauth/kakao`로 전환 |
| R3 | Expo SecureStore가 web에서 미동작 | `pnpm --filter @pinch/mobile web` 시 자동 로그인 미동작 | Android/iOS 우선 검증. web fallback은 별도 작업 |
| R4 | 카카오 OAuth가 같은 이메일로 가입한 password 사용자와 충돌 | 가입 plan 충돌 | `409 EMAIL_TAKEN_BY_LOCAL` 에러로 명시적 거부. 추후 계정 통합 UX 별도 설계 |
| R5 | jest가 모바일 패키지에 미설정 | F1 커밋에서 초기 설정 작업 필요 | `jest`, `jest-expo`, `@testing-library/react-native` 도입 |
| R6 | bcrypt가 native binding 필요 | Windows/리눅스 빌드 환경 차이 가능 | `bcrypt` 대신 `bcryptjs`(pure JS) 검토. 시드 시간 길어지지만 환경 호환성 우월 |
| R7 | 별명 unique 제약으로 시드 시 200명 별명 중복 가능성 | 시드 실패 | "워커001"~"워커200" 패턴으로 명시적 unique 보장 |
| R8 | 약관 화면 콘텐츠 미확정 | 회원가입 화면의 ">" 진입 비활성 | 본 작업 §2.6에 따라 비활성 처리. 콘텐츠 확정 시 별도 작업 |
| R9 | 카카오 REST API 키 노출 위험 | git 커밋·로그 노출 | `.env`만 사용, `.env.example`은 placeholder. dev 단계 종료 후 키 회전 권장 |
| R10 | 작업 범위가 크고 위험 작업 (여러 영역 교차 변경) | 1회 지시로 처리 시 누락 위험 | Phase A~F로 분할, 각 Phase마다 typecheck+테스트 게이트 |

---

## 12. 후속 작업 (별도 PR로 분리)

본 계획서 완료 후 진행할 작업 목록.

| 후속 # | 제목 | 사유 |
|---|---|---|
| F-01 | k6 부하 테스트 email 로그인 기반 갱신 | dev-login 제거에 따른 회귀 |
| F-02 | Apple OAuth 실동작 | 외부 인프라 준비 완료 시 |
| F-03 | 네이버 OAuth 실동작 | 동일 |
| F-04 | 페이스북 OAuth 실동작 | 동일 |
| F-05 | 이메일 본인 인증 (메일 발송) | SMTP 인프라 준비 후 |
| F-06 | 비밀번호 재설정 | F-05 의존 |
| F-07 | Refresh Token 회전 | 액세스 토큰 만료 UX 개선 |
| F-08 | shared/ui 디자인 시스템 컴포넌트 확장 | 토큰 기반 컴포넌트 라이브러리 |
| F-09 | 약관 상세 화면 + 콘텐츠 | 콘텐츠 확정 후 |
| F-10 | 추천 코드 도메인 (referral) | 마케팅 의사결정 후 |
| F-11 | 핸드폰 본인 인증 (Slice 3 NICE/다날) | 외부 인프라 |
| F-12 | 카카오 SDK 직접 통합 (EAS Build) | EAS 도입 시 |

---

## 13. 참고 자료

- 백엔드 현행 인증: `apps/api/src/auth/{auth.controller,auth.service,jwt.strategy,types}.ts`
- 백엔드 스키마: `apps/api/prisma/schema.prisma`
- 모바일 공통 axios: `apps/mobile/src/shared/api/apiClient.ts`
- 디자인 토큰: `packages/ui-tokens/src/tokens.ts`
- 디자인 참고 이미지: `.claude/images/{로그인,이메일로 로그인,이메일로 회원가입_1,이메일로 회원가입_2}.png`
- FSD 규칙: `.claude/rules/frontend-architecture.md`
- 코드 컨벤션: `.claude/rules/frontend-coding-rules.md`
- 카카오 로그인 REST API: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
- expo-auth-session: https://docs.expo.dev/versions/latest/sdk/auth-session/
