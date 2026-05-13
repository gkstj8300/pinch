# 프론트엔드 폴더 구조 — Feature-Sliced Design (FSD)

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 프론트엔드 폴더 구조 — Feature-Sliced Design |
| 버전 | v1.0.0 |
| 작성일 | 2026-05-13 |
| 기반 문서 | https://feature-sliced.design (외부 표준) |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2026-05-13 | — | 신규 작성 — Worker Mobile(RN+Expo) / Client Web(React) 양 앱에 FSD 채택 |

---

## 2. 채택 배경

- **단방향 의존**으로 6개월 후 합류 협업자도 즉시 파악 가능한 구조 확보
- **비즈니스 도메인(공고/매칭/지갑/리뷰)을 `entities/` 에 격리** → 백엔드 API·DTO 변경의 파급 최소화
- Worker Mobile(RN+Expo) 과 Client Web(React) **양 앱에 동일 규칙** 적용 → 컨텍스트 스위칭 비용 감소
- 추후 `packages/shared` 모노레포 도입 시 그대로 호환

---

## 3. 레이어 계층 — 위에서 아래로만 의존

| 레이어 | 역할 | 예시 |
|---|---|---|
| `app/` | 앱 초기화·프로바이더·라우팅 셋업 | `App.tsx`, `Providers.tsx`, `routes.tsx` |
| `pages/` | 라우트 단위 화면 컴포지션 | `pages/job-detail/`, `pages/wallet/` |
| `widgets/` | 큰 UI 블록 (헤더·사이드바·카드 그룹) | `widgets/job-list/`, `widgets/header/` |
| `features/` | 사용자 상호작용 단위 | `features/apply-to-job/`, `features/check-in/` |
| `entities/` | 비즈니스 도메인 모델 | `entities/job/`, `entities/match/`, `entities/wallet/` |
| `shared/` | 재사용 유틸·UI 키트·API client·디자인 토큰 | `shared/ui/`, `shared/lib/`, `shared/api/`, `shared/config/` |

### 의존 규칙

- **상위 레이어 → 하위 레이어** 만 import 허용 (단방향)
- **같은 레이어 내 slice 간 import 금지** — features 끼리, entities 끼리 등
- 순환 의존 금지 (모든 import 그래프는 DAG)
- `shared/` 는 **어떤 레이어도 import 하지 않는다**

---

## 4. Slice (도메인) 구분

각 레이어 안에서 **기능/엔티티 단위 slice** 를 만든다.

### PINCH Worker Mobile 예시

```
src/
├── app/
│   ├── providers/        QueryClient, ConfigProvider, ThemeProvider
│   ├── App.tsx
│   └── routes.tsx        Expo Router 설정
├── pages/
│   ├── home/
│   ├── job-search/
│   ├── job-detail/
│   ├── my-schedule/
│   ├── check-in/
│   ├── wallet/
│   └── profile/
├── widgets/
│   ├── job-list/
│   ├── match-card-list/
│   └── nav-bar/
├── features/
│   ├── apply-to-job/
│   ├── scan-qr-check-in/
│   ├── check-out/
│   ├── withdraw/
│   ├── leave-review/
│   └── otp-login/
├── entities/
│   ├── job/
│   ├── match/
│   ├── wallet/
│   ├── transaction/
│   ├── review/
│   └── user/
└── shared/
    ├── ui/               Button, Input, Badge, Toast (디자인시스템.md 토큰)
    ├── lib/              haversine, formatCurrency, dayjs setup
    ├── api/              apiClient, queryKeys, authInterceptor
    └── config/           env, routes, constants
```

### PINCH Client Web 예시

동일 구조. `pages/` 만 사업주 화면으로 교체:

```
pages/
├── dashboard/
├── job-create/
├── job-management/
├── attendance-realtime/
├── settlement/
└── profile/
```

---

## 5. Segment (slice 내부 구성)

각 slice 는 다음 segment 로 구성한다:

```
entities/job/
├── ui/             JobCard.tsx, JobThumbnail.tsx, JobBadge.tsx
├── model/          types.ts, store.ts (Zustand), selectors.ts
├── api/            useJobQuery.ts, useSearchJobsQuery.ts (TanStack Query)
├── lib/            formatHourlyWage.ts, calcEstimatedPay.ts
├── config/         constants.ts (CATEGORY_LABELS 등)
└── index.ts        ★ Public API (배럴 export)
```

| Segment | 역할 |
|---|---|
| `ui/` | 컴포넌트 (React/RN) |
| `model/` | 상태·타입·selector (Zustand·useReducer 등) |
| `api/` | 서버 통신 (REST/GraphQL/TanStack Query hook) |
| `lib/` | 순수 함수·유틸 |
| `config/` | 상수·환경별 설정 |

모든 segment 가 항상 필요한 건 아님. 필요한 것만 만든다.

---

## 6. Public API 규칙

- 각 slice 는 **`index.ts` 한 곳에서만 export**
- 외부에서는 `import { JobCard } from '@/entities/job'` 처럼 slice 루트 경로 사용
- **내부 파일 직접 import 금지** (`import { JobCard } from '@/entities/job/ui/JobCard'` ❌)
- ESLint 로 강제 권장 (`@conarti/feature-sliced` 등)

---

## 7. PINCH 적용 우선순위

| 순서 | 작업 |
|---|---|
| 1 | `shared/ui` — 디자인시스템.md 의 토큰을 컴포넌트화 (Button, Input, Badge 등) |
| 2 | `entities/*` — 백엔드 모델 1:1 매핑 (Job/Match/Wallet 등) |
| 3 | `features/*` — entities + shared 만 조합해 UX 동작 구현 |
| 4 | `widgets/*` — features 조합 (`widgets/job-list` = `entities/job` UI + `features/apply-to-job`) |
| 5 | `pages/*` — widgets 배치만 |
| 6 | `app/*` — 라우팅·프로바이더 결선 |

---

## 8. 모노레포 구조 (도입 시)

```
apps/
├── mobile/           Worker App (RN + Expo) — 위 FSD 구조 그대로
│   └── src/{app,pages,widgets,features,entities,shared}/
└── web/              Client Web (React) — 위 FSD 구조 그대로
    └── src/{app,pages,widgets,features,entities,shared}/
packages/
├── ui-tokens/        디자인 토큰 (색·타이포·간격) — 디자인시스템.md 산출물
├── api-types/        백엔드 DTO 와 1:1 공유 타입
└── shared-lib/       크로스 플랫폼 유틸 (Haversine, 정산 산식 등 — 백엔드 코드와 검증된 동일 로직)
```

> 백엔드 `src/libs/geo/haversine.ts` 와 `src/libs/settlement/withholding.ts` 는 향후 `packages/shared-lib` 로 이전 가능 — 서버·클라 동일 로직 보장.

---

## 9. 안티 패턴 (즉시 거절)

| 안티 패턴 | 이유 |
|---|---|
| `features/apply-to-job` → `features/check-in` import | 같은 레이어 horizontal 의존 — DAG 깨짐 |
| `entities/job` → `features/apply-to-job` import | 역방향 — entities 는 비즈니스 로직만 |
| `shared/` 가 다른 레이어 참조 | 재사용성 파괴 |
| `pages/home` → `pages/wallet` import | 페이지 간 이동은 라우터로 |
| slice 내부 파일 직접 import (`/entities/job/ui/JobCard`) | Public API 우회 |
| 한 slice 에 도메인 2개 이상 (`entities/job-and-match`) | 단일 책임 위반 |

---

## 10. 점검 체크리스트 (PR 제출 전)

- [ ] 새 파일이 정확한 레이어에 있는가? (`features` vs `entities` 혼동 없음)
- [ ] 같은 레이어 내 slice import 없음
- [ ] 모든 외부 참조가 `index.ts` 를 통해 일어남
- [ ] `shared/` 가 어떤 레이어도 import 하지 않음
- [ ] slice 가 단일 도메인만 다룸
- [ ] segment 구분이 명확 (UI 코드가 `model/` 에 섞이지 않음)

---

## 11. 참고 자료

- 공식 문서: https://feature-sliced.design
- ESLint 플러그인: `@conarti/eslint-plugin-feature-sliced`
- 한국어 가이드: https://emewjin.github.io/feature-sliced-design
