# Phase 완료 검토 규칙

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | Phase 완료 검토 규칙 |
| 버전 | v0.1.0 |
| 작성일 | 2026-05-07 |
| 기반 문서 | /docs/spec/06-implementation-plan.md |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-07 | Claude | 신규 작성 — 4개 페르소나 교차 토론 결과 반영 |

---

## 2. 개요

각 Phase 완료 시 수행해야 하는 검토 절차, 테스트 기준, 결과 기록 형식, 인수인계 체크리스트, 회귀 방지 규칙을 정의한다.

### 적용 원칙

- **수직 슬라이스 검증**: 해당 Phase의 산출물만으로 동작하는 최소 검증이 반드시 통과해야 한다.
- **페르소나별 책임 분리**: 각 Phase에 주도 페르소나가 있으나, 모든 페르소나가 자신의 전문 영역을 교차 검토한다.
- **자동화 우선**: 자동화 가능한 검증은 반드시 자동화하고, 수동 검증은 자동화가 불가능한 항목에 한정한다.

> **[설계 근거]** 자동화 우선 원칙에 대해 페르소나 간 논의가 있었다. UI Artisan은 접근성 검증과 시각적 일관성은 수동 검증이 불가피하다고 주장했고, Sync Master는 Realtime 지연 측정도 자동화가 어렵다고 보충했다. 최종 합의로 "자동화 가능한 것은 반드시 자동화, 수동은 자동화 불가능한 항목에 한정"으로 정리되었다.

---

## 3. Phase 완료 검토 절차

Phase 완료 시 아래 5단계를 순서대로 수행한다.

### 단계 1: 자동화 테스트 실행

주도 페르소나가 해당 Phase의 자동화 테스트 스위트를 전부 실행하고 통과를 확인한다.

```bash
# 공통 명령어
pnpm turbo typecheck    # 전체 타입 체크
pnpm turbo lint         # 전체 린트
pnpm turbo test         # 전체 단위·통합 테스트
pnpm turbo build        # 전체 빌드
```

### 단계 2: 회귀 테스트 실행

이전 Phase에서 작성된 테스트를 포함하여 전체 테스트 스위트를 실행한다. 새로 추가된 코드가 기존 기능을 깨뜨리지 않았는지 확인한다. (상세 규칙은 [8. 회귀 테스트 규칙](#8-회귀-테스트-규칙) 참조)

### 단계 3: 페르소나별 교차 검토

각 페르소나가 자신의 전문 영역에 해당하는 체크리스트 항목을 검토한다. (상세 항목은 [4. Phase별 검토 체크리스트](#4-phase별-검토-체크리스트) 참조)

### 단계 4: 완료 기준 대조

`/docs/spec/06-implementation-plan.md`에 명시된 해당 Phase의 **완료 기준**을 항목별로 대조하고, 모든 항목이 충족되었는지 확인한다.

### 단계 5: 검토 결과 기록 및 인수인계

검토 결과를 기록하고, 다음 Phase 담당자에게 인수인계 문서를 전달한다. (형식은 [6. 검토 결과 기록 형식](#6-검토-결과-기록-형식), [7. Phase 간 인수인계 체크리스트](#7-phase-간-인수인계-체크리스트) 참조)

> **[설계 근거]** Monorepo Lead는 단계 4(완료 기준 대조)를 단계 1 직후에 배치하자고 제안했으나, Engine Designer가 "자동화 테스트와 교차 검토를 먼저 하지 않으면 완료 기준의 '정상 동작' 여부를 판단할 근거가 없다"고 반박하여 현재 순서로 합의되었다.

---

## 4. Phase별 검토 체크리스트

각 Phase에서 페르소나별로 검토해야 하는 항목을 정의한다. `[필수]`는 통과하지 않으면 Phase 완료 불가, `[권장]`은 미충족 시 사유를 기록하고 다음 Phase에서 해결 가능하다.

### Phase 1 — 프로젝트 기반 구축

| 페르소나 | 검토 항목 |
|----------|-----------|
| **Monorepo Lead** | `[필수]` pnpm workspace 정상 해석 확인 (`pnpm install` 성공) |
| | `[필수]` TurboRepo 태스크 파이프라인 (build, lint, typecheck, test, dev) 정상 실행 |
| | `[필수]` `catalog:` 프로토콜로 핵심 의존성 버전 통일 확인 |
| | `[필수]` CI 파이프라인(install → typecheck → lint → build) 정상 실행 |
| | `[필수]` `.env.example` 템플릿 존재, `.env*.local`이 `.gitignore`에 포함 |
| **Engine Designer** | `[필수]` `supabase/config.toml` 존재 및 설정 유효성 확인 |
| | `[필수]` `supabase start` 로컬 실행 성공 |
| **Sync Master** | `[필수]` `packages/shared` 더미 export를 `apps/web`에서 import 가능 확인 |
| | `[권장]` TanStack Query, Zustand 의존성이 `catalog:`에 등록되었는지 확인 |
| **UI Artisan** | `[필수]` `apps/web` localhost:3000 빈 페이지 렌더링 확인 |
| | `[필수]` `apps/mobile` Expo Go 빈 화면 렌더링 확인 |
| | `[권장]` `@repo/tsconfig`에 strict 모드 활성화 확인 |

### Phase 2 — 데이터베이스 구축

| 페르소나 | 검토 항목 |
|----------|-----------|
| **Engine Designer** | `[필수]` `supabase db reset` → 마이그레이션 전체 적용 성공 |
| | `[필수]` `purchase_stock` RPC SQL 직접 호출로 재고 차감 + 주문 생성 확인 |
| | `[필수]` 동시 호출 시뮬레이션(pgbench)에서 초과 판매 0건 |
| | `[필수]` RLS 정책: 비인가 접근 차단 확인 |
| | `[필수]` `REPLICA IDENTITY FULL` 설정 확인 (stocks 테이블) |
| | `[필수]` CHECK 제약 조건 동작 확인 (`stocks.quantity >= 0`, `time_sales.starts_at < ends_at`) |
| | `[필수]` 시드 데이터 최소 기준 충족 (상품 30건, 타임세일 4건, 사용자 2명) |
| **Monorepo Lead** | `[필수]` 마이그레이션 파일 네이밍 규칙 일관성 확인 |
| | `[필수]` `supabase gen types` 스크립트 정상 실행 확인 |
| **Sync Master** | `[필수]` CDC Publication 활성화 확인 (`stocks`, `time_sales` 테이블) |
| | `[권장]` CDC 이벤트에 `quantity`, `initial_quantity` 등 전체 컬럼 포함 확인 |
| **UI Artisan** | `[권장]` 시드 데이터의 상품 정보가 UI 렌더링에 충분한지 확인 (이미지 URL, 설명 등) |

> **[설계 근거]** waitlist 테이블은 Phase 2에서 DDL만 생성하고 RLS/RPC는 Phase 7A로 이관했으므로, Phase 2 검토에서 waitlist 관련 항목은 제외한다. Engine Designer와 Sync Master의 합의에 따른 것이다.

### Phase 3 — 공유 패키지 구축

| 페르소나 | 검토 항목 |
|----------|-----------|
| **Monorepo Lead** | `[필수]` `@repo/shared`, `@repo/ui` 패키지가 `apps/web`에서 import 가능 |
| | `[필수]` 패키지 간 의존 방향 검증 (shared → ui 참조 불가, 단방향 확인) |
| | `[필수]` `pnpm turbo build` 전체 패키지 빌드 성공 |
| **Engine Designer** | `[필수]` Supabase 클라이언트 서버/브라우저 분리 확인 (`createServerClient`, `createBrowserClient`) |
| | `[필수]` Zod 스키마가 DB 스키마와 정합성 유지 확인 |
| **Sync Master** | `[필수]` TanStack Query 훅(`useProducts`, `useProductDetail` 등)으로 데이터 조회 성공 |
| | `[필수]` Query Key 팩토리 중앙 관리 구조 확인 |
| | `[필수]` QueryClientConfig 팩토리 함수 설정 주입 구조 확인 |
| | `[필수]` Zustand 스토어 동작 확인 (`cartStore`, `connectionStore`) |
| **UI Artisan** | `[필수]` 디자인 토큰(`tokens.ts`) 정의 완전성 확인 (색상, 간격, 타이포그래피, 그림자) |
| | `[권장]` 디자인 토큰 TypeScript 타입 안전성 확인 |

> **[설계 근거]** Realtime 구독 훅(`useRealtimeStock`), 구독 레지스트리, 스로틀링 유틸은 Phase 5로 이관되었으므로 Phase 3 검토 범위에서 제외한다. Sync Master의 제안으로 "빈 껍데기 코드"를 방지하고 수직 슬라이스 검증 원칙을 준수하기 위함이다.

### Phase 4 — 웹 앱 코어 구현

| 페르소나 | 검토 항목 |
|----------|-----------|
| **UI Artisan** | `[필수]` 5개 핵심 페이지 렌더링 확인 (홈, 상품 목록, 상품 상세, 장바구니, 주문 내역) |
| | `[필수]` 반응형 레이아웃: 360px, 768px, 1280px 각 뷰포트 정상 확인 |
| | `[필수]` 긴박감 UI 컴포넌트 상태별 검증 (게이지 바 4단계, 카운트다운, 희소성 뱃지 3단계) |
| | `[필수]` Lighthouse 접근성 점수 80+ |
| | `[필수]` 키보드 네비게이션 동작 확인 |
| | `[필수]` `prefers-reduced-motion` 대응 확인 |
| | `[필수]` 터치 타겟 최소 44x44px 준수 |
| **Monorepo Lead** | `[필수]` ISR 페이지 빌드 타임 정적 생성 + revalidate 동작 확인 |
| | `[필수]` 디자인 토큰 → `tailwind.config.ts` 테마 변환 적용 확인 |
| **Engine Designer** | `[필수]` RLS 재검증: Supabase Auth 세션으로 본인 주문만 조회 가능 확인 |
| | `[필수]` 인증 플로우 (로그인/회원가입/로그아웃) 정상 동작 |
| | `[필수]` 미들웨어 보호 라우트 정상 동작 |
| **Sync Master** | `[필수]` `@repo/shared` 훅으로 Supabase 데이터 조회 확인 |
| | `[필수]` 긴박감 UI 컴포넌트 props 인터페이스 확정 확인 (`React.memo` 분리 포함) |

> **[설계 근거]** 긴박감 UI "껍데기"를 Phase 4에 포함하는 것에 대해 Monorepo Lead가 의문을 제기했으나, UI Artisan이 접근성(`aria-live`, `prefers-reduced-motion`) 검증과 디자인 토큰 적용 확인, `React.memo` 분리 및 props 인터페이스 확정을 위해 필수적이라고 주장하여 유지하기로 합의했다. Sync Master도 Phase 5에서 데이터 연결만 하면 되도록 컴포넌트 구조가 사전 확정되어야 한다고 동의했다.

### Phase 5 — 실시간 동기화 통합

| 페르소나 | 검토 항목 |
|----------|-----------|
| **Sync Master** | `[필수]` 브라우저 2개에서 구매 시 상대편 재고 숫자 변경 확인 |
| | `[필수]` CDC → UI 반영 100ms 이내 확인 (측정 방법: `updated_at` vs `performance.now()` 차이) |
| | `[필수]` 낙관적 업데이트: 구매 클릭 즉시 UI 차감 → 서버 실패 시 롤백 |
| | `[필수]` 구독 레지스트리: 동일 상품 2개 컴포넌트 구독 시 채널 1개만 생성 |
| | `[필수]` 고빈도 업데이트(1초 10회 이상) 시 60fps 유지 |
| | `[필수]` 품절 이벤트(quantity 1→0) 스로틀링 우회 즉시 반영 |
| | `[필수]` 네트워크 차단 → 복구 시 최신 재고 자동 갱신 |
| **Engine Designer** | `[필수]` Realtime 채널 구조 검증 (`product-stock:{id}`, `time-sale:{id}`) |
| | `[필수]` 뮤테이션 진행 중 Realtime 이벤트 지연 처리 확인 (UI 깜빡임 방지) |
| **UI Artisan** | `[필수]` 재고 숫자 롤링 애니메이션 동작 확인 |
| | `[필수]` `prefers-reduced-motion` 사용자: 즉시 값 변경 대체 확인 |
| | `[필수]` 오프라인 배너 UI 표시 + 구매 버튼 비활성화 확인 |
| **Monorepo Lead** | `[필수]` `connectionStore` 상태 관리 정상 동작 확인 |

### Phase 6 — 모바일 앱 구현

| 페르소나 | 검토 항목 |
|----------|-----------|
| **UI Artisan** | `[필수]` 5개 핵심 화면 렌더링 확인 |
| | `[필수]` Tamagui 테마가 `@repo/ui` 디자인 토큰과 시각적 일치 확인 |
| | `[필수]` `accessibilityLabel` 전체 적용 확인 |
| | `[필수]` 터치 타겟 최소 44x44pt 준수 |
| | `[필수]` 스크린 리더(VoiceOver/TalkBack) 기본 호환 확인 |
| **Monorepo Lead** | `[필수]` `@repo/shared` 훅 재사용률 확인 |
| | `[필수]` Expo Router 네비게이션 정상 동작 |
| | `[필수]` 디자인 토큰 → `tamagui.config.ts` 테마 변환 적용 확인 |
| **Engine Designer** | `[필수]` SecureStore 기반 Auth 세션 RLS 재검증 |
| **Sync Master** | `[필수]` 실시간 재고 업데이트 앱에서 동작 확인 |
| | `[필수]` TanStack Query 설정 오버라이드 동작 확인 (포그라운드 복귀 리패치 등) |
| | `[필수]` Expo + Supabase Realtime WebSocket 호환성 확인 |

### Phase 7A — 타임 세일 + 결제 + 대기열

| 페르소나 | 검토 항목 |
|----------|-----------|
| **Engine Designer** | `[필수]` `confirm_payment` RPC 정상 동작 |
| | `[필수]` Edge Function → `purchase_stock` RPC 호출 경로만 허용 (직접 `UPDATE stocks` 차단) |
| | `[필수]` `admit_from_waitlist` RPC 정상 동작 |
| | `[필수]` waitlist RLS 정책 + 인덱스 추가 마이그레이션 적용 확인 |
| **Sync Master** | `[필수]` 타임 세일 카운트다운 실시간 연결 확인 |
| | `[필수]` 대기열 순번 실시간 감소 확인 |
| | `[필수]` 결제 → 주문 확정 전체 플로우 데이터 동기화 확인 |
| **UI Artisan** | `[필수]` 타임 세일 활성화 → 할인가 표시 → 세일 종료 UI 플로우 |
| | `[필수]` 대기열 UI: 진입 → 순번 표시 → 입장 허가 → 페이지 이동 |
| **Monorepo Lead** | `[필수]` Edge Function 타입 import (`database.types.ts` 복사 스크립트) 정상 동작 |

### Phase 7B — 모바일 고급 기능

| 페르소나 | 검토 항목 |
|----------|-----------|
| **UI Artisan** | `[필수]` 푸시 알림 수신 확인 (재고 임박 트리거) |
| | `[필수]` 생체 인증 → 결제 확인 → 주문 생성 플로우 동작 |
| | `[필수]` PIN 폴백 동작 확인 |
| **Sync Master** | `[필수]` 오프라인 → 온라인 재동기화 후 데이터 정합성 확인 |
| | `[필수]` AsyncStorage 캐시 + 로컬 큐 순차 전송 동작 확인 |
| **Engine Designer** | `[필수]` Edge Function + FCM 연동 정상 동작 |
| | `[필수]` 재고 임박(5개 미만) 트리거 조건 정확성 확인 |
| **Monorepo Lead** | `[필수]` 모바일 전용 기능이 `@repo/shared`에 불필요한 의존성을 추가하지 않았는지 확인 |

### Phase 8 — 최적화 및 안정화

| 페르소나 | 검토 항목 |
|----------|-----------|
| **Monorepo Lead** | `[필수]` 웹 Lighthouse 성능 90+ |
| | `[필수]` 번들 사이즈 분석 완료 |
| | `[필수]` Vercel 배포 + EAS Build 설정 완료 |
| | `[필수]` Supabase Production 환경 분리 완료 |
| **Engine Designer** | `[필수]` 동시 100명 구매 시뮬레이션 초과 판매 0건 |
| | `[필수]` 쿼리 실행 계획 분석 + 인덱스 효율성 점검 완료 |
| **Sync Master** | `[필수]` E2E 테스트: 구매 전체 플로우 (Playwright) 통과 |
| | `[필수]` 부하 테스트 결과 기록 |
| **UI Artisan** | `[필수]` Lighthouse 접근성 90+ |
| | `[필수]` 스크린 리더 전체 플로우 수동 테스트 완료 |
| | `[필수]` 고대비 모드 확인 |
| | `[필수]` FlashList 최적화 (모바일 렌더링 프로파일링) |

---

## 5. 테스트 기준

### 테스트 유형 분류

| 유형 | 설명 | 자동화 여부 |
|------|------|-------------|
| 타입 체크 | `tsc --noEmit` 또는 `pnpm turbo typecheck` | 필수 자동화 |
| 린트 | ESLint + Prettier | 필수 자동화 |
| 단위 테스트 | 유틸, 훅, RPC 등 개별 함수 | 필수 자동화 |
| 통합 테스트 | 여러 모듈 간 연동 (낙관적 업데이트 롤백 등) | 필수 자동화 |
| E2E 테스트 | 사용자 시나리오 전체 플로우 (Playwright) | Phase 8에서 필수 자동화 |
| 부하 테스트 | 동시 접속 시뮬레이션 (pgbench, k6 등) | Phase 8에서 필수 자동화 |
| 접근성 테스트 | Lighthouse 점수 측정 | 자동화 (CI 연동 권장) |
| 시각적 검증 | 반응형 레이아웃, 디자인 토큰 적용 | 수동 |
| 스크린 리더 테스트 | VoiceOver/TalkBack 호환성 | 수동 |
| Realtime 지연 측정 | CDC → UI 반영 시간 | 수동 (콘솔 로그 기반) |

### Phase별 필수 테스트

| Phase | 필수 자동화 테스트 | 필수 수동 테스트 |
|-------|-------------------|-----------------|
| 1 | 타입 체크, 린트, 빌드 | 로컬 실행 확인 (web, mobile, supabase) |
| 2 | 타입 체크, RPC 단위 테스트, pgbench 동시 호출 | RLS 수동 검증 |
| 3 | 타입 체크, 린트, 유틸 단위 테스트, Zod 스키마 테스트 | Query 훅 데이터 조회 확인 |
| 4 | 타입 체크, 린트, 빌드, 컴포넌트 단위 테스트 | 반응형 시각 검증, 접근성 수동 확인 |
| 5 | 타입 체크, 구독 레지스트리 단위 테스트, 스로틀링 단위 테스트, 낙관적 업데이트 통합 테스트 | Realtime 지연 측정, 60fps 확인 |
| 6 | 타입 체크, 린트, 빌드 | 스크린 리더 기본 호환, 디자인 토큰 시각 검증 |
| 7A | 타입 체크, 결제 검증 통합 테스트, 대기열 순번 테스트 | 전체 플로우 수동 확인 |
| 7B | 타입 체크, 오프라인 재동기화 통합 테스트 | 푸시 알림 수신, 생체 인증 수동 확인 |
| 8 | 전체 테스트 스위트, E2E (Playwright), 부하 테스트 | 스크린 리더 전체 플로우, 고대비 모드 |

> **[설계 근거]** E2E 테스트를 각 Phase마다 필수로 할지 논의가 있었다. Sync Master는 Phase 5부터 E2E를 도입하자고 제안했으나, Monorepo Lead가 "각 Phase의 단위·통합 테스트로 충분히 커버 가능하며, E2E는 전체 시스템이 완성된 Phase 8에서 집중하는 것이 효율적"이라고 반박했다. Engine Designer도 "Phase별 완료 기준에 이미 수동 검증 항목이 있으므로 중복"이라고 동의하여, E2E는 Phase 8 필수로 합의되었다.

---

## 6. 검토 결과 기록 형식

### 기록 위치

검토 결과는 `/docs/reviews/` 디렉터리에 Phase별 파일로 기록한다.

```
docs/reviews/
├── phase-1-review.md
├── phase-2-review.md
├── ...
└── phase-8-review.md
```

### 기록 템플릿

각 Phase 검토 결과 파일은 아래 형식을 따른다. (문서 정보 섹션은 `/docs/rules/document-template-rule.md` 규격을 적용한다.)

```markdown
# Phase {N} 검토 결과

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | Phase {N} 검토 결과 |
| 버전 | v0.1.0 |
| 작성일 | {YYYY-MM-DD} |
| 기반 문서 | /docs/rules/phase-review-rule.md, /docs/spec/06-implementation-plan.md |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | {YYYY-MM-DD} | {작성자} | 신규 작성 |

---

## 2. 자동화 테스트 결과

| 테스트 유형 | 결과 | 비고 |
|-------------|------|------|
| 타입 체크 | PASS / FAIL | |
| 린트 | PASS / FAIL | |
| 단위 테스트 | PASS (N/N) | 통과/전체 |
| 통합 테스트 | PASS (N/N) | 통과/전체 |
| 빌드 | PASS / FAIL | |

## 3. 회귀 테스트 결과

| 대상 Phase | 테스트 수 | 결과 | 비고 |
|------------|-----------|------|------|
| Phase 1 | N건 | PASS / FAIL | |
| Phase 2 | N건 | PASS / FAIL | |
| ... | | | |

## 4. 페르소나별 검토 결과

### Monorepo Lead

| 검토 항목 | 결과 | 비고 |
|-----------|------|------|
| {항목} | PASS / FAIL / N/A | |

### Engine Designer

| 검토 항목 | 결과 | 비고 |
|-----------|------|------|
| {항목} | PASS / FAIL / N/A | |

### Sync Master

| 검토 항목 | 결과 | 비고 |
|-----------|------|------|
| {항목} | PASS / FAIL / N/A | |

### UI Artisan

| 검토 항목 | 결과 | 비고 |
|-----------|------|------|
| {항목} | PASS / FAIL / N/A | |

## 5. 완료 기준 대조

| 완료 기준 항목 | 충족 여부 | 비고 |
|----------------|-----------|------|
| {06-implementation-plan.md의 완료 기준 항목} | YES / NO | |

## 6. 미해결 사항

| 항목 | 심각도 | 담당 페르소나 | 해결 예정 Phase | 비고 |
|------|--------|--------------|-----------------|------|
| | HIGH / MEDIUM / LOW | | | |

## 7. 인수인계 사항

다음 Phase 담당자에게 전달할 사항을 기술한다. (상세 형식은 Phase 간 인수인계 체크리스트 참조)
```

### 기록 규칙

1. 모든 `[필수]` 항목이 `PASS`여야 Phase 완료로 인정한다.
2. `FAIL` 항목이 있을 경우, 미해결 사항에 심각도와 해결 예정 Phase를 기록한다.
3. `HIGH` 심각도 항목이 1건이라도 있으면 Phase 완료 불가 — 해당 항목을 먼저 해결한다.
4. `MEDIUM` 심각도 항목은 다음 Phase 시작 전까지 해결 계획을 수립한다.
5. `LOW` 심각도 항목은 인수인계 사항에 기록하고 다음 Phase에서 해결 가능하다.

> **[설계 근거]** 심각도 3단계 분류는 Engine Designer가 제안했다. UI Artisan은 "시각적 미세 조정까지 HIGH로 분류되면 Phase 진행이 불필요하게 지연된다"고 우려했고, Monorepo Lead가 "기능 동작에 영향을 주는 것은 HIGH, 품질 개선은 MEDIUM, 스타일 미세 조정은 LOW"라는 기준을 제안하여 합의되었다.

---

## 7. Phase 간 인수인계 체크리스트

Phase N 완료 후, Phase N+1 시작 전에 아래 항목을 확인한다.

### 공통 인수인계 항목

- [ ] Phase N 검토 결과 문서(`/docs/reviews/phase-{N}-review.md`)가 작성 완료되었는가?
- [ ] 모든 `[필수]` 검토 항목이 `PASS`인가?
- [ ] `HIGH` 심각도 미해결 사항이 0건인가?
- [ ] Phase N+1의 선행 조건(`06-implementation-plan.md` 기재)이 모두 충족되었는가?
- [ ] Phase N에서 추가된 자동화 테스트가 CI에 포함되어 정상 실행되는가?
- [ ] Phase N에서 생성/변경된 파일 목록이 검토 결과 문서에 기록되었는가?

### Phase별 추가 인수인계 항목

| 인수 Phase | 인계 Phase | 추가 확인 항목 |
|------------|------------|----------------|
| 1 → 2 | `supabase/` 디렉터리 구조, `config.toml` 설정값 전달 |
| 2 → 3 | `supabase gen types` 출력 타입 파일 경로, RPC 함수 시그니처 목록, CDC 설정 상태 |
| 3 → 4 | `@repo/shared` export 목록, Query 훅 인터페이스, 디자인 토큰 구조, Supabase 클라이언트 사용법 |
| 3 → 6 | (4와 동일) + AsyncStorage 어댑터 주입 방법 |
| 4 → 5 | 긴박감 UI 컴포넌트 props 인터페이스, `React.memo` 분리 구조, 재고 표시 컴포넌트 위치 |
| 5 → 6 | Realtime 훅 사용법, 구독 레지스트리 API, 설정 오버라이드 방법 |
| 5 → 7A | Realtime 채널 구조, `connectionStore` 상태 관리 방식 |
| 6 → 7B | 모바일 인증 구조(SecureStore), 화면 네비게이션 구조, Tamagui 스타일링 패턴 |
| 7A → 7B | `confirm_payment` RPC 인터페이스 (생체 인증 결제에 필요) |
| 7A, 7B → 8 | 전체 기능 목록, 알려진 성능 병목, 미해결 `MEDIUM`/`LOW` 항목 |

> **[설계 근거]** Sync Master는 "인수인계가 형식적으로 끝나면 다음 Phase에서 삽질이 반복된다"고 지적하며, 구체적인 인터페이스 정보(props, 훅 시그니처, 설정 오버라이드 방법)를 인수인계 항목에 포함할 것을 강하게 요구했다. 특히 Phase 4 → 5 인수인계에서 긴박감 UI 컴포넌트의 props 인터페이스가 명시되지 않으면 Phase 5에서 컴포넌트를 수정하게 되어 관심사 분리가 깨진다는 점이 합의의 핵심 근거였다.

---

## 8. 회귀 테스트 규칙

### 원칙

1. **누적 실행**: Phase N 완료 시, Phase 1부터 Phase N까지의 모든 자동화 테스트를 실행한다.
2. **CI 강제**: 모든 자동화 테스트는 CI 파이프라인에 포함되어 PR 머지 전에 통과해야 한다.
3. **실패 시 차단**: 이전 Phase의 테스트가 1건이라도 실패하면 현재 Phase 완료 불가.

### Phase별 회귀 테스트 범위

| 현재 Phase | 회귀 테스트 대상 | 비고 |
|------------|-----------------|------|
| 2 | Phase 1 (빌드, 린트, 타입 체크) | |
| 3 | Phase 1~2 | Phase 2 RPC 단위 테스트 포함 |
| 4 | Phase 1~3 | Phase 3 유틸·Zod 단위 테스트 포함 |
| 5 | Phase 1~4 | Phase 4 컴포넌트 테스트 포함 |
| 6 | Phase 1~5 | Phase 5 Realtime 단위 테스트 포함 |
| 7A | Phase 1~6 | 전체 |
| 7B | Phase 1~7A | 전체 |
| 8 | Phase 1~7B | 전체 + E2E + 부하 테스트 |

### 회귀 실패 대응 절차

1. 실패한 테스트를 식별하고, 해당 테스트가 속한 Phase의 주도 페르소나에게 통보한다.
2. 현재 Phase의 코드 변경이 원인인지, 기존 테스트의 결함인지 판별한다.
3. 현재 Phase의 코드가 원인이면 수정 후 재실행한다.
4. 기존 테스트의 결함이면 테스트를 수정하되, 수정 사유를 검토 결과 문서에 기록한다.

> **[설계 근거]** Engine Designer는 "회귀 테스트 범위가 Phase가 진행될수록 기하급수적으로 늘어나 CI 시간이 길어진다"고 우려했다. Monorepo Lead가 TurboRepo의 캐시 기능을 활용하면 변경되지 않은 패키지의 테스트는 캐시 히트로 빠르게 통과한다고 설명했다. 최종 합의로 "전체 테스트 누적 실행하되 TurboRepo 캐시를 활용하여 실행 시간을 최소화"하기로 결정되었다. 단, `--force` 플래그로 캐시를 무시하는 전체 실행은 Phase 완료 검토 시에만 1회 수행한다.

### TurboRepo 캐시 전략

- **일상 개발**: `pnpm turbo test` (캐시 활용, 변경된 패키지만 재실행)
- **Phase 완료 검토**: `pnpm turbo test --force` (캐시 무시, 전체 재실행 1회)
- **CI PR 체크**: `pnpm turbo test` (캐시 활용)

---

## 9. 예외 처리

### Phase 완료 기준 미달 시

1. 미달 항목을 식별하고 심각도를 분류한다.
2. `HIGH`: 해당 Phase 내에서 반드시 해결한다. Phase 완료 불가.
3. `MEDIUM`: 해결 계획을 수립하고, 다음 Phase 시작 1주 이내 해결을 목표로 한다. 인수인계 문서에 명시한다.
4. `LOW`: 인수인계 문서에 기록하고, Phase 8(최적화) 이전까지 해결한다.

### 병렬 Phase 검토 (Phase 4+6, Phase 7A+7B)

병렬로 진행되는 Phase는 각각 독립적으로 검토한다. 단, 공유 자원(`@repo/shared`, `@repo/ui`)에 대한 변경이 있을 경우 양쪽 Phase의 주도 페르소나가 합동으로 영향 범위를 검토한다.

### 구현 계획서 변경 시

`/docs/spec/06-implementation-plan.md`의 Phase 내용이 변경되면 본 문서의 해당 Phase 검토 체크리스트도 함께 갱신한다. 변경 이력에 갱신 사유를 기록한다.
