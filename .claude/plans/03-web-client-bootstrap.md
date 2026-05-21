# `apps/web` 사업주 웹 부트스트랩 계획 (W1)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | apps/web 사업주 웹 부트스트랩 계획 |
| 버전 | v0.1.0 |
| 작성일 | 2026-05-21 |
| 기반 문서 | .claude/설계서.md, .claude/docs/API명세.md, .claude/rules/frontend-architecture.md, .claude/rules/frontend-coding-rules.md, .claude/plans/01-mobile-login-flow.md, .claude/plans/02-refresh-token-rotation.md, packages/ui-tokens/src/tokens.ts, apps/mobile/src/shared/api/apiClient.ts |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-21 | — | 신규 작성 — Next.js App Router + FSD + Tailwind v4 기반 사업주 웹 1차 부트스트랩 (셋업 + 이메일 로그인 + 빈 대시보드) |

---

## 2. 개요 및 배경

### 2.1 목적

PINCH 모노레포에 **사업주용 웹 클라이언트 `apps/web`** 을 신규 추가한다. 1차 PR 범위는 사용자 합의에 따라 **A 옵션 — 셋업 + 사업주 이메일 로그인 + 빈 대시보드** 로 한정한다. 사업주 기능별 화면(공고 등록·관리, 출퇴근 모니터링, 정산)은 후속 PR 시리즈로 분리한다.

### 2.2 사용자 합의 사항

| 결정 | 값 | 근거 |
|---|---|---|
| 빌드 도구 | **Next.js (App Router)** | SSR/SSG 지원, 추후 랜딩페이지/블로그 재사용. 사용자 명시 선택 |
| 1차 PR 범위 | **A — 셋업 + 로그인 + 빈 대시보드** | 안전 작업단위 + 단계별 진척 |

### 2.3 현재 상태 (정찰 결과)

- **모노레포**: `pnpm-workspace.yaml` 이 `apps/*`, `packages/*` 를 인식.
- **백엔드** `apps/api`: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` 등 인증 API 완비 (F-07 적용 후). CORS 활성 (`app.enableCors()` — Expo Go 호환). 시드 사업주 1명: `client@pinch.local / pinch1234!`.
- **모바일** `apps/mobile`: FSD 구조 + axios 401 자동 회전 + jest 테스트 인프라.
- **디자인 토큰**: `packages/ui-tokens/src/tokens.ts` — pink #fa2454 identity, gray 9단계, support 컬러, Pretendard 타이포 + heading/body/caption, 8-base spacing, radius.
- **node-linker**: `node-linker=hoisted` (Expo 호환 위해). 신규 web 패키지도 hoisted 영향 받음 — 검증 필요.

### 2.4 본 작업 범위 (포함)

- ✅ `apps/web` 패키지 신규 추가 + `pnpm-workspace.yaml` 자동 인식 확인
- ✅ Next.js 15 (App Router) + React 19 + TypeScript strict
- ✅ Tailwind v4 + `@theme` 로 `packages/ui-tokens` 디자인 토큰 매핑
- ✅ FSD 구조 (`shared / entities / features / widgets / pages-via-app-router`)
- ✅ `shared/api/apiClient.ts` — 모바일과 동일한 401 자동 회전 패턴 (web 환경: localStorage 토큰 저장)
- ✅ `entities/user` — `useAuthStore` (Zustand), `useMeQuery`, `auth-token`
- ✅ `features/client-login` — 사업주 이메일 로그인 (백엔드 `/auth/login` 재사용, role=CLIENT 검증)
- ✅ `shared/ui` — Button, Input 최소 컴포넌트 (Tailwind + 토큰)
- ✅ 라우트 — `/` (splash redirect), `/login` (이메일 로그인), `/home` (빈 대시보드 + 사용자 정보 + 로그아웃)
- ✅ Next.js middleware 로 보호 라우트 가드 (토큰 검증 후 미인증 시 `/login` 리다이렉트)
- ✅ ESLint + 모바일과 동일한 코딩 컨벤션
- ✅ Vitest + React Testing Library 단위 테스트 (Login form + apiClient interceptor)
- ✅ API명세 §6 Slice 활성화 일정에 `apps/web` 진입 명시
- ✅ 설계서 §3.2 Client 웹 항목 갱신

### 2.5 본 작업에서 제외 (별도 후속 PR)

| 제외 항목 | 사유 | 후속 |
|---|---|---|
| 사업주 회원가입 화면 | 1차는 기존 시드 사업주(`client@pinch.local`)로 로그인만 — 가입은 별도 작업 (사업자등록번호 검증 포함) | W2 |
| 카카오/네이버/페이스북 OAuth 사업주 | 사업주는 이메일 인증이 정석 | (없음) |
| 공고 등록·관리 화면 | 사업주 핵심 기능 — 큰 작업 | W3 |
| 출퇴근 실시간 모니터링 | 위치 + 실시간 데이터 | W4 |
| 정산 화면 | 백엔드 정산 API + 회계 데이터 | W5 |
| 사업자등록번호 검증 (PortOne API) | 외부 인프라 | W2 의존 |
| HttpOnly cookie 토큰 전환 | 1차는 모바일과 동일 localStorage 패턴 — XSS 노출 dev 한정 | W6 (운영 진입 전) |
| SSR 페이지 (랜딩) | 사업주 도메인은 인증 후 사용 — SEO 불필요 | (필요 시 별도) |
| Storybook | 1차 컴포넌트 수 작음 | 컴포넌트 수 늘면 도입 |

### 2.6 단순화 결정

| 항목 | 결정 | 사유 |
|---|---|---|
| 라우팅 | Next.js App Router 의 file-based | TanStack Router 등 추가 없음 |
| 데이터 fetch | TanStack Query + axios (모바일과 동일 패턴) | SSR 데이터 fetch 는 1차 미사용 (인증 후 client-only) |
| 상태 관리 | Zustand (모바일과 동일) | 추가 패키지 없음 |
| 폼 라이브러리 | 미사용 — 1차 로그인 폼은 `useState` 로 충분 | react-hook-form 은 큰 폼 등장 시 도입 |
| 인증 토큰 저장 | localStorage (web 분기) | 모바일 `apiClient` 와 동일 패턴 — `Platform.OS === 'web'` 분기 이미 존재 |
| 401 자동 회전 | 모바일과 동일 로직 (`refreshPromise` 공유, `_retried` 가드) | 코드 재사용은 안 하고 web 전용 구현 — 추후 `packages/api-client` 분리 검토 |
| 사업주 role 검증 | `useMeQuery` 응답 `role` 이 CLIENT 가 아니면 `/login` 으로 강제 리다이렉트 + 토큰 무효화 | 워커가 사업주 도메인에 잘못 진입 차단 |

---

## 3. 라우트 트리

```
src/app/
├── layout.tsx                 Root layout (Providers wrapper)
├── globals.css                Tailwind + @theme 디자인 토큰
├── page.tsx                   ★ / → /login or /home redirect (splash)
├── providers.tsx              QueryClient + 기타 Provider (FSD app layer 대체)
├── login/
│   └── page.tsx               ★ 사업주 이메일 로그인
├── home/
│   └── page.tsx               ★ 빈 대시보드 + 사용자 정보 + 로그아웃
└── middleware.ts (또는 root middleware.ts) ★ 보호 라우트 가드
```

> Next.js 의 `src/app/` 은 file-based router 전용. FSD 의 `app/` 레이어(providers, theme 등)는 `app/providers.tsx` 같은 일반 파일로 공존시킨다.

### 3.1 화면별 상세

#### 3.1.1 `/` (Splash redirect)

| 항목 | 내용 |
|---|---|
| Server/Client | Client component (token 검사 필요) |
| UI | 화면 중앙 로딩 인디케이터 |
| 로직 | mount 즉시 `useMeQuery` 발화 → settled 시 분기. 토큰 무효/네트워크 실패 → `/login`. role !== 'CLIENT' → `/login` + 토큰 무효화. 정상 + CLIENT → `/home` |

#### 3.1.2 `/login` (사업주 이메일 로그인)

| 영역 | 내용 |
|---|---|
| 헤더 | PINCH 로고 (텍스트 placeholder) + "사업주 로그인" 타이틀 |
| 입력 | 이메일 (`input[type="email"]`) / 비밀번호 (`input[type="password"]`) |
| CTA | "로그인하기" — 두 필드 검증 통과 전 disabled, 통과 시 identity pink |
| 에러 | 폼 하단 인라인 텍스트 — `INVALID_CREDENTIALS` / 네트워크 실패 / `role !== 'CLIENT'` 케이스 |
| 보조 | (1차 비활성) 비밀번호 재설정 / 회원가입 링크 — 후속 PR |

#### 3.1.3 `/home` (빈 대시보드)

| 영역 | 내용 |
|---|---|
| 헤더 | PINCH 로고 + 사용자 이메일 + 로그아웃 버튼 |
| 메인 | 빈 placeholder — "환영합니다, {email}!" + "공고 관리 기능은 다음 업데이트에서 제공됩니다" 안내 |
| 로그아웃 | `clearSession()` 호출 → `/login` 으로 리다이렉트 |

#### 3.1.4 보호 라우트 가드 (Next.js middleware)

> 1차에서는 client-side guard 만 사용 — `useMeQuery` 가 401 받으면 자동 `/login` 리다이렉트. Next.js middleware 의 server-side guard 는 토큰을 cookie 로 다루지 않는 한 효과 제한적이라 W6 (cookie 전환) 에서 도입.

---

## 4. 패키지 구성

### 4.1 `apps/web/package.json` (핵심 deps)

```json
{
  "name": "@pinch/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@pinch/ui-tokens": "workspace:*",
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "next": "^15.0.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "~19.1.10",
    "@types/react-dom": "~19.1.10",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "happy-dom": "^15.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "typescript": "^5.6.3",
    "vitest": "^2.0.0"
  }
}
```

> 의존성 버전은 모바일 / api 의 catalog 와 일관성 유지. Tailwind v4 + `@tailwindcss/postcss` 사용. Next.js 15 + React 19 호환.

### 4.2 FSD 디렉터리

```
apps/web/src/
├── app/                       # Next.js App Router routes
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx               # / splash
│   ├── providers.tsx          # FSD app layer (QueryClient 등)
│   ├── login/page.tsx
│   └── home/page.tsx
├── widgets/                   # (1차에는 비어있음 — 후속 PR 진입 시)
├── features/
│   └── client-login/
│       ├── api/useLoginMutation.ts
│       ├── lib/validateLoginForm.ts
│       ├── ui/ClientLoginForm.tsx
│       └── index.ts
├── entities/
│   └── user/
│       ├── api/
│       │   ├── auth-token.ts
│       │   ├── useMeQuery.ts
│       │   └── index.ts
│       ├── model/
│       │   ├── store.ts
│       │   ├── types.ts
│       │   └── __tests__/store.test.ts
│       └── index.ts
└── shared/
    ├── api/
    │   ├── apiClient.ts
    │   ├── queryKeys.ts
    │   ├── index.ts
    │   └── __tests__/apiClient.test.ts
    ├── config/
    │   └── env.ts
    └── ui/
        ├── Button.tsx
        ├── Input.tsx
        └── index.ts
```

### 4.3 의존 방향 (FSD 단방향)

```
app/login/page.tsx       → features/client-login → entities/user → shared/{api, ui, config}
app/home/page.tsx        → entities/user                          → shared/{api, ui}
app/page.tsx (splash)    → entities/user                          → shared/api
```

- features 간 import 없음 (`client-login` 1개)
- `entities/user` 와 모바일의 동일 슬라이스는 별도 — `packages/api-types` 추출 시점에 공유 검토

---

## 5. 인증·토큰 흐름

### 5.1 토큰 저장

`apps/web/src/shared/api/apiClient.ts` — 모바일과 동일한 구조이되 web 전용으로 단순화:

```typescript
const ACCESS_TOKEN_KEY = 'pinch.accessToken';
const REFRESH_TOKEN_KEY = 'pinch.refreshToken';

function read(key: string): string | null {
  if (typeof window === 'undefined') return null;       // SSR/RSC 환경
  return window.localStorage.getItem(key);
}
// write/getAccessToken/setAccessToken/getRefreshToken/setRefreshToken 동일 패턴
```

### 5.2 401 자동 회전

모바일과 동일 패턴 — `refreshPromise` 공유 + `original._retried` 가드 + `/auth/refresh` · `/auth/logout` 가드.

### 5.3 사업주 role 검증

`useMeQuery` 응답이 `role !== 'CLIENT'` 이면 즉시 `clearSession()` + `/login` 리다이렉트 + 인라인 메시지 "사업주 계정이 아닙니다".

### 5.4 로그아웃

모바일의 `clearSession` 과 동일 — best-effort `/auth/logout` 호출 후 양 토큰 + Zustand user 무효화.

---

## 6. 디자인 토큰 통합

### 6.1 Tailwind v4 `@theme` (`globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-identity: #fa2454;
  --color-identity-hover: #ef0035;
  --color-identity-sub: #ffd1dc;
  --color-gray-0: #fdfdfd;
  --color-gray-10: #e9edf0;
  /* ... packages/ui-tokens/src/tokens.ts 의 colors 전체 */

  --spacing-01: 4px;
  --spacing-02: 8px;
  /* ... */

  --radius-01: 4px;
  --radius-full: 9999px;

  --font-pretendard: "Pretendard", ui-sans-serif, system-ui;
}
```

> 토큰 → CSS 변수 매핑 스크립트는 1차에서 manual. 토큰 수가 늘면 build script 로 자동 생성 검토.

### 6.2 폰트

Pretendard 는 `next/font/google` 사용 불가 (Google Fonts 미존재). 대안:
- 옵션 A: `cdn.jsdelivr.net/gh/orioncactus/pretendard` 의 webfont CDN 을 `globals.css` 에 `@font-face`
- 옵션 B: `pretendard` npm 패키지를 추가하고 `next/font/local`

> 1차는 옵션 A (CDN) — 가장 단순. 폰트 호스팅 정책 정립 시 옵션 B 로 교체.

---

## 7. 테스트 계획

`.claude/rules/test-guide.md` 적용.

### 7.1 단위 테스트 (Vitest + RTL)

| 대상 | 파일 | 케이스 |
|---|---|---|
| `validateLoginForm` | `features/client-login/lib/__tests__/validateLoginForm.test.ts` | 이메일/비밀번호 정상·엣지 (모바일과 동일 패턴) |
| `useAuthStore` + `clearSession` | `entities/user/model/__tests__/store.test.ts` | 모바일과 동일 |
| `useLoginMutation` | `features/client-login/api/__tests__/useLoginMutation.test.tsx` | 200 OK / 401 / 네트워크 실패 + role !== CLIENT 거부 |
| `apiClient` 401 자동 회전 | `shared/api/__tests__/apiClient.test.ts` | 401 → refresh → 재시도 / 동시 5개 → 1회 refresh / refresh 실패 시 토큰 무효화 |

> jest 가 아닌 Vitest 채택 — Next.js + Tailwind v4 환경에서 jsdom/happy-dom 통합이 매끄러움. 모바일은 jest-expo, 웹은 vitest 로 분리해도 무방 (CI 에서 별도 task).

### 7.2 수동 통합 검증

- [ ] `pnpm --filter @pinch/web dev` → `localhost:3000` 빈 화면 + Next.js 정상 부팅
- [ ] `/login` 진입 → 빈 이메일/비번 시 버튼 disabled
- [ ] 시드 사업주(`client@pinch.local / pinch1234!`)로 로그인 → `/home` 진입 + 이메일 표시
- [ ] 잘못된 비밀번호 → `INVALID_CREDENTIALS` 인라인 표시
- [ ] 워커 계정(`worker001@pinch.local`)으로 로그인 시도 → "사업주 계정이 아닙니다" 메시지 + 토큰 무효화
- [ ] 로그아웃 → `/auth/logout` 호출 후 `/login` 복귀
- [ ] localStorage 토큰 임의로 만료시켜 401 시뮬레이션 → 자동 refresh 후 화면 정상 유지
- [ ] CORS 정상 (`apps/api` 가 `app.enableCors()` 활성)

### 7.3 완료 기준

- 위 단위 테스트 4종 전부 PASS
- 수동 검증 7항목 통과
- `pnpm --filter @pinch/web typecheck` PASS
- `pnpm --filter @pinch/web lint` PASS
- `pnpm --filter @pinch/web build` PASS (Next.js production build 통과)
- 기존 모바일/api 테스트 회귀 없음 (`turbo test` 전체 PASS)

---

## 8. 작업 단계 (Atomic Commits)

브랜치: `feat/web-bootstrap`

### 8.1 Phase A — 패키지 스캐폴딩

| # | 커밋 | 변경 |
|---|---|---|
| A1 | `chore(web): apps/web 패키지 신규 + Next.js 15 scaffold` | `apps/web/{package.json, tsconfig.json, next.config.ts, .gitignore}` |
| A2 | `chore(web): Tailwind v4 + @theme 디자인 토큰 매핑` | `apps/web/{postcss.config.js, src/app/globals.css}` |
| A3 | `chore(web): Pretendard 웹폰트 CDN + Root layout` | `apps/web/src/app/{layout.tsx, page.tsx 빈 placeholder}` |
| A4 | `chore(web): ESLint + eslint-config-next` | `apps/web/eslint.config.js` |

### 8.2 Phase B — shared / entities 기반

| # | 커밋 | 변경 |
|---|---|---|
| B1 | `feat(web): shared/api apiClient + 401 자동 회전 (web 전용)` | `apps/web/src/shared/api/**` |
| B2 | `feat(web): shared/ui Button + Input + shared/config env` | `apps/web/src/shared/{ui, config}/**` |
| B3 | `feat(web): entities/user — useAuthStore + useMeQuery + auth-token` | `apps/web/src/entities/user/**` |

### 8.3 Phase C — features + pages

| # | 커밋 | 변경 |
|---|---|---|
| C1 | `feat(web): features/client-login slice` | `apps/web/src/features/client-login/**` |
| C2 | `feat(web): /login 페이지` | `apps/web/src/app/login/page.tsx` |
| C3 | `feat(web): /home 빈 대시보드 + 로그아웃` | `apps/web/src/app/home/page.tsx` |
| C4 | `feat(web): / splash redirect + role 가드` | `apps/web/src/app/page.tsx` |

### 8.4 Phase D — 테스트

| # | 커밋 | 변경 |
|---|---|---|
| D1 | `chore(web): vitest + RTL 셋업` | `apps/web/{vitest.config.ts, vitest.setup.ts}` |
| D2 | `test(web): 단위 테스트 4종 (validateLoginForm / store / mutation / apiClient)` | `apps/web/src/**/__tests__/**` |

### 8.5 Phase E — 문서 동기화

| # | 커밋 | 변경 |
|---|---|---|
| E1 | `docs(spec): 설계서 §3.2 + API명세 §6 apps/web 진입 명시` | `.claude/설계서.md`, `.claude/docs/API명세.md` |
| E2 | `docs(plan): W1 검증 결과 노트` (선택) | `.claude/plans/03-web-client-bootstrap.md` §10 |

> 각 Phase 마다 typecheck + 해당 영역 test 통과 후 다음으로. 위험 작업 분산.

---

## 9. 위험 요소 및 가정

| # | 항목 | 영향 | 대응 |
|---|---|---|---|
| R1 | `node-linker=hoisted` 가 Next.js 와 호환되지 않을 가능성 | dev 부팅 실패 | Next.js 15 는 hoisted node_modules 정상 지원 — Phase A 직후 검증. 충돌 시 `.npmrc` 의 `public-hoist-pattern` 으로 우회 |
| R2 | Next.js 의 `src/app/` 디렉터리가 FSD `app/` 레이어와 이름 충돌 | 신규 합류자 혼선 | `app/providers.tsx` 같은 일반 모듈로 FSD app 레이어 표현. README/plan 에 명시 |
| R3 | Tailwind v4 + Next.js 15 통합 이슈 | 빌드 실패 | Tailwind v4 공식 Next.js 가이드 따름. `@tailwindcss/postcss` 사용 |
| R4 | localStorage 토큰의 XSS 노출 | dev 단계 한정 — 운영 진입 시 위협 | W6 에서 HttpOnly cookie 로 전환. plan §2.5 명시 |
| R5 | 모바일 apiClient 와 코드 중복 (401 회전 로직) | DRY 위반 | 1차 의도적 중복 (web 전용 SSR 대응 분기). 컴포넌트 라이브러리 패키지(`packages/api-client`) 추출은 후속 |
| R6 | 사업주 role 검증을 client-side 만 한다 | 토큰 위조 시 우회 가능 | 백엔드 `/auth/me` 가 user.role 을 반환 — 위조 시 401 또는 잘못된 role. 백엔드 별도 가드 (CLIENT 전용 endpoint 가드) 는 후속 작업에서 |
| R7 | React 19 + Next.js 15 의 호환성 이슈 | 미정 | 정찰 단계에서 공식 호환성 확인. 문제 시 Next.js 14 fallback |
| R8 | Vitest + happy-dom 의 RN-test-library 와 격리 | 양쪽 테스트 환경 충돌 가능 | 모바일은 jest-expo (이미 동작), 웹은 vitest — 패키지별 격리. CI 에서 별도 task |
| R9 | Pretendard 웹폰트 CDN 의 가용성 | 폰트 미로드 시 fallback (sans-serif) | 1차 acceptable. W6 단계에서 npm 패키지로 self-host |
| R10 | 작업 범위가 큰 위험 작업 | 누락 위험 | Phase A~E 분할, 각 Phase typecheck/test 게이트. 1차 PR 범위 명시 |

---

## 10. 후속 작업 (별도 PR)

| 후속 # | 제목 | 사유 |
|---|---|---|
| W2 | 사업주 회원가입 + 사업자등록번호 검증 (PortOne) | 정식 진입 흐름 |
| W3 | 공고 등록·관리 화면 | 사업주 핵심 기능 |
| W4 | 출퇴근 실시간 모니터링 | 위치 + 실시간 |
| W5 | 정산 화면 + 엑셀 추출 | 회계 자동화 |
| W6 | HttpOnly cookie 토큰 전환 | XSS 대응 |
| W7 | 사업주 푸시 알림 (브라우저) | 워커 도착·이탈 알림 |
| W8 | i18n (한/영) | 외국인 사업주 확장 |
| W9 | apps/web 의 디자인 시스템 → packages/ui 추출 | 모바일 RN 컴포넌트와 분리 |

---

## 11. 참고 자료

- Next.js 15 App Router: https://nextjs.org/docs/app
- Tailwind v4 + Next.js: https://tailwindcss.com/docs/guides/nextjs
- React 19 + Next.js 호환: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
- Pretendard CDN: https://github.com/orioncactus/pretendard
- 기존 plan: `.claude/plans/01-mobile-login-flow.md`, `.claude/plans/02-refresh-token-rotation.md`
- FSD: `.claude/rules/frontend-architecture.md`
- 모바일 apiClient: `apps/mobile/src/shared/api/apiClient.ts`
