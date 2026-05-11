# 코드 구조 전략 — 상수 & 타입 관리

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 코드 구조 전략 — 상수 & 타입 관리 |
| 버전 | v1.0.0 |
| 작성일 | 2026-05-07 |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|

---

## 2. 상수 분류 기준

상수는 **사용 범위**에 따라 두 가지로 분류한다.

| 분류 | 정의 | 예시 |
|------|------|------|
| **공통 상수** | 2개 이상 도메인(feature)에서 사용하거나, 앱 전역에서 참조하는 값 | `ROWS_PER_PAGE`, `DAY_NAMES_SHORT`, `DEPT_LIST`, `ERROR_MESSAGES` |
| **도메인 상수** | 특정 feature 내부에서만 사용하는 값 | `CORRECTION_BADGE`, `STATUS_TAB_MAP`, `PERIOD_TABS` |

---

## 3. 상수 파일 배치 규칙

| 분류 | 파일 경로 | 비고 |
|------|-----------|------|

### 배치 원칙

1. **컴포넌트/페이지 파일에 상수를 인라인으로 선언하지 않는다.** 상수는 반드시 `constants.ts`에 모아서 관리한다.
2. **유틸 함수 파일(`utils/*.ts`)에 상수를 섞지 않는다.** 유틸 파일은 순수 함수만 포함한다.
3. 동일 값이 2곳 이상에서 사용되면 상위 레벨로 올린다.
   - 같은 feature 내 2곳 이상 → `features/{domain}/constants.ts`
   - 2개 이상 feature에서 사용 → `lib/constants.ts`

---

## 4. 상수 네이밍 컨벤션

| 규칙 | 예시 |
|------|------|
| `UPPER_SNAKE_CASE` | `ROWS_PER_PAGE`, `DAY_NAMES_SHORT` |
| 배열은 복수형 | `DAY_NAMES_SHORT`, `REQUEST_TYPES` |
| 매핑 객체는 `_MAP`, `_BADGE`, `_LABEL` 등 용도 접미어 | `STATUS_TAB_MAP`, `CORRECTION_BADGE` |
| 옵션 배열(select/filter용)은 `_OPTIONS` 접미어 | `DEPT_FILTER_OPTIONS`, `ATTENDANCE_STATUS_OPTIONS` |
| `as const` 단언은 리터럴 타입이 필요한 경우에만 사용 | `['일', '월', ...] as const` |

---

## 5. 인라인 상수 금지 원칙

컴포넌트나 페이지 파일 최상단에 `const FOO = ...` 형태로 상수를 선언하는 것을 금지한다.

### 허용되는 예외

- **컴포넌트 내부에서만 사용하는 스타일 맵핑** (예: column 정의 배열) — 이는 UI 로직의 일부이므로 상수가 아닌 컴포넌트 구현으로 취급
- **테스트 파일의 mock 데이터**

### 금지 사유

- 중복 선언 방지 (같은 값이 여러 컴포넌트에 복사됨)
- 변경 시 영향 범위 파악 용이
- 상수와 UI 로직의 관심사 분리

---

## 6. 타입 분류 체계

API 추상화 레이어(mapper 패턴) 도입으로 타입을 역할별 5개 파일로 분산 관리한다. 백엔드 변경 시 API 파일의 mapper만 수정하면 되도록 계층을 분리한다.

| 파일 | 역할 | Import 허용 범위 |
|------|------|------------------|
| `types/server.ts` | 백엔드 JSON과 1:1 대응하는 타입. `Server` namespace로 격리 | `features/*/api/*.api.ts`, `test/msw/*.handlers.ts` |
| `types/entities.ts` | UI 계층 비즈니스 모델. 컴포넌트가 의존하는 안정 계약 | 모든 계층 |
| `types/api.ts` | API Request/Response 타입 + `ErrorCode` + `ApiError` | 모든 계층 |
| `types/errors.ts` | 서버 에러코드 → 앱 에러코드 매핑 함수 | `lib/api-client.ts` |


