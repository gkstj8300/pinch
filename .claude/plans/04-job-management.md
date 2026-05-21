# 사업주 공고 등록·관리 (W3) 1차 부트스트랩 계획

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | 사업주 공고 등록·관리 1차 부트스트랩 계획 |
| 버전 | v0.1.0 |
| 작성일 | 2026-05-21 |
| 기반 문서 | .claude/설계서.md, .claude/docs/API명세.md, .claude/plans/03-web-client-bootstrap.md, .claude/rules/frontend-architecture.md, .claude/rules/frontend-coding-rules.md, apps/api/prisma/schema.prisma, apps/api/src/jobs/jobs.service.ts, apps/api/src/jobs/jobs.controller.ts |

### 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v0.1.0 | 2026-05-21 | — | 신규 작성 — apps/web 사업주의 공고 목록·등록·상세 화면 + 백엔드 POST /jobs + GET /jobs/my + 카카오맵 geocoding 통합 |

---

## 2. 개요 및 배경

### 2.1 목적

W1 부트스트랩으로 갖춰진 `apps/web` 위에 **사업주의 공고 등록·관리** 핵심 기능을 도입한다. 1차 PR 범위는 사용자 합의된 **A — 공고 목록 + 등록 + 상세 조회** 로 제한하고, 수정·삭제·상태 전환은 W3.1 로 분리한다.

### 2.2 사용자 합의 사항

| 결정 | 값 | 근거 |
|---|---|---|
| 1차 PR 범위 | **A — 목록 + 등록 + 상세** | 안전 작업단위, 단계별 진척 |
| Geocoding | **B — 카카오맵 API 연동** | UX 향상, 기존 KAKAO_REST_API_KEY 재사용 가능 |

### 2.3 현재 상태 (정찰 결과)

- 백엔드 `apps/api/src/jobs/`
  - `JobsController` — `GET /jobs/search` (워커용 위치 기반, PostGIS KNN), `GET /jobs/:id` 만 존재
  - `JobsService` — `search`(공개 흐름) + `findOne`(사업주 정보 포함)
  - **`POST /jobs`, `GET /jobs/my`, `PATCH/DELETE` 미존재** — 본 작업에서 신설
- DB `Job` 모델 (이미 정의됨):
  - 컬럼: `id, client_id, title, description, category, address, latitude, longitude, location(PostGIS), start_at, end_at, hourly_wage, estimated_minutes, recruit_count, confirmed_count, min_pinch_score, require_verified, check_in_radius_m, status`
  - 트리거: `latitude/longitude` 변경 시 PostGIS `location` 동기화 (migration init 에서 정의됨)
  - 인덱스: `(status, start_at, deleted_at)`, `(client_id, deleted_at)` 등
- `.env`: `KAKAO_REST_API_KEY=70d8db6c99799796a660966c718f3d6d` (이미 OAuth 용으로 등록). **카카오 로컬 API(주소→좌표 변환) 도 동일 REST key 사용 가능** — 별도 키 발급 불필요.
- `apps/web` (W1 완료): Next.js 15, FSD, Tailwind v4, axios 401 자동 회전, 사업주 `/login` + 빈 `/home`.

### 2.4 본 작업 범위 (포함)

- ✅ 백엔드: `POST /jobs` (사업주 공고 등록), `GET /jobs/my` (내 공고 목록), `GET /jobs/:id` (기존 활용 — `client.role` 검증 + ownership 가드 추가는 없음, 누구나 상세 조회 가능 — 워커앱과 공유)
- ✅ 백엔드 가드: `POST /jobs`, `GET /jobs/my` 는 `role === 'CLIENT'` 전용 (`@CurrentUser` + role 검사 데코레이터)
- ✅ 사업주 ownership: `POST /jobs` 의 `client_id` 는 JWT `sub` 로 자동 할당 (body 무시)
- ✅ 카카오 로컬 API 통합: 주소 텍스트 → 좌표/정확 주소. 프론트엔드에서 직접 호출 (`Authorization: KakaoAK ${KAKAO_REST_API_KEY}`)
- ✅ `apps/web` 화면 4종:
  - `/home` 갱신 — "공고 관리로 이동" 링크
  - `/jobs` 사업주 공고 목록 (페이지네이션 1차는 단순 page 또는 limit/offset)
  - `/jobs/new` 공고 등록 폼 (주소 검색 모달 + 좌표 자동 채우기)
  - `/jobs/[id]` 사업주용 공고 상세 (응시자 수, 상태, 시급 등 표시)
- ✅ FSD slice: `entities/job` + `features/{job-create, job-list}`
- ✅ shared/api 에 `kakaoLocalClient` (REST API, dapi.kakao.com)
- ✅ Vitest 단위 테스트: validateJobForm + useCreateJobMutation + useMyJobsQuery + kakaoLocalClient + jobs.service.spec(api)
- ✅ 백엔드 jest spec: `JobsService.createForClient` / `JobsService.findMyJobs` + role 가드
- ✅ 문서: API명세 v0.5.0 (POST/jobs, GET /jobs/my 추가), 설계서 §3.2 갱신

### 2.5 본 작업에서 제외 (후속 PR)

| 제외 항목 | 사유 | 후속 |
|---|---|---|
| 공고 수정 (`PATCH /jobs/:id`) | 1차 단순화 — 등록 후 잘못된 정보 수정은 별도 흐름 | W3.1 |
| 공고 삭제 / 모집 마감 (`DELETE`, `POST /jobs/:id/close`) | 상태 전환 정책 (모집 중 → 마감, 시작 후 → 진행 등) 정밀 설계 필요 | W3.1 |
| 카카오맵 SDK 지도 시각화 위젯 | 1차는 좌표 텍스트 + 확정 메시지로 충분 | W3.2 |
| 공고 템플릿 저장 (재사용) | 사업주가 자주 등록하는 형태 저장 | W3.3 |
| 카테고리 enum 정식화 (DB CHECK) | 1차는 frontend 의 추천 카테고리 목록 + 자유 입력 | 운영 데이터 분석 후 |
| 공고 이미지 첨부 | S3 또는 Supabase Storage 인프라 결정 필요 | W3.4 |
| 워커앱의 공고 목록 화면 | 워커앱에서 `/jobs/search` 는 별도 plan (W3-mobile) | 별도 |
| 추천 좌표 다중 선택 (1개 이상 결과 시 사용자 선택) | 1차는 첫 결과 자동 적용 + 텍스트 검토 | W3.2 |
| 공고 검색·필터 (사업주 입장) | 1차 목록은 created_at desc 단순 정렬 | W3.5 |

### 2.6 단순화 결정

| 항목 | 결정 | 사유 |
|---|---|---|
| 페이지네이션 | offset 기반 (`?page=&limit=`) | 사업주별 공고 수가 적음 — cursor 불필요 |
| 정렬 | `created_at DESC` 고정 | 1차는 옵션 없음 |
| 시간 입력 | HTML5 `datetime-local` | 별도 라이브러리 미도입. Asia/Seoul 가정 |
| 카테고리 | 추천 5~7개 + 자유 입력 허용 (`<input list>` datalist) | 사업주 도메인 다양성 보존 |
| `estimated_minutes` | 사업주가 직접 입력 (HH:MM 종료 - 시작 자동 계산 보조) | 정확성 책임은 사업주 |
| `check_in_radius_m` | 기본값 150m (DB default), 1차 폼은 노출 안 함 | 추후 사업주 권한 확장 시 노출 |
| `min_pinch_score` / `require_verified` | 기본값(0 / true), 폼 노출 안 함 | 1차는 단순화 |
| 응답 envelope | 현 컨트롤러 패턴 그대로 (envelope 없이 객체 직접) | API명세 §3.1 v0.3.0 노트와 일관 |

---

## 3. 화면 구성 (apps/web)

### 3.1 라우트 트리

```
src/app/
├── home/page.tsx            (갱신 — "공고 관리" 진입 카드)
├── jobs/
│   ├── page.tsx             ★ 사업주 공고 목록
│   ├── new/page.tsx         ★ 공고 등록 폼
│   └── [id]/page.tsx        ★ 공고 상세
```

### 3.2 화면별 상세

#### 3.2.1 `/home` 갱신

- 기존 "다음 업데이트에서 제공" 안내 → "공고 관리" 카드(클릭 → `/jobs`) + "공고 등록" 카드(클릭 → `/jobs/new`).

#### 3.2.2 `/jobs` 사업주 공고 목록

| 영역 | 내용 |
|---|---|
| 헤더 | "내 공고" + "공고 등록하기" CTA |
| 목록 | 공고 카드 — 제목 / 카테고리 / 주소 / 시작-종료 시각 / 시급 / 모집 (`confirmed / recruit`) / 상태 뱃지 |
| 페이지네이션 | "이전" / "다음" 버튼 + 현재 페이지 표시 |
| 빈 상태 | "아직 등록한 공고가 없습니다 — 첫 공고를 등록해보세요" + CTA |

#### 3.2.3 `/jobs/new` 공고 등록

| 영역 | 내용 |
|---|---|
| 헤더 | "공고 등록" + ← 뒤로가기 |
| 입력 | 제목 / 설명 (textarea) / 카테고리 (datalist 추천) / 주소(`<input>` + "주소 확인" 버튼) / 좌표 표시 (read-only, 검색 후 자동 채움) / 시작 시각 / 종료 시각 / 시급 / 모집 인원 |
| 카카오 검색 흐름 | 사용자가 주소 입력 → "주소 확인" 클릭 → `dapi.kakao.com/v2/local/search/address.json?query=...` 호출 → 첫 결과로 `address`(정확) + `latitude`/`longitude` 자동 채움 → 미리보기 텍스트 표시. 결과 없으면 에러 |
| 검증 | 각 필드 (title 5~120, description 10~1000, address 1~255, lat/lng range, start_at < end_at, hourly_wage >= 최저시급(2026 기준 10,030원), recruit_count 1~50, end_at - start_at = estimated_minutes 자동 계산) |
| CTA | "등록" — 검증 통과 + 카카오 좌표 확인 완료 시 활성. 200 OK → `/jobs/[id]` 로 push |

#### 3.2.4 `/jobs/[id]` 공고 상세

| 영역 | 내용 |
|---|---|
| 헤더 | 공고 제목 + 상태 뱃지 + ← 목록으로 |
| 정보 | 카테고리 / 주소 (지도 미리보기 텍스트) / 시작-종료 / 시급·예상지급 / 모집 (`confirmed/recruit`) / 사업주 정보 (이름·평점·총 리뷰) |
| 상태 가드 | `client_id !== currentUser.id` 이면 "본인 공고만 조회 가능" 안내 + `/jobs` 리다이렉트 (UX 가드, 백엔드는 누구나 조회 허용) |

---

## 4. 백엔드 변경 (`apps/api`)

### 4.1 DB 스키마 변경

**없음.** 기존 `Job` 모델로 충분. 인덱스도 추가 안 함 (`(client_id, deleted_at)` 이 이미 존재 — `/jobs/my` 에 활용).

### 4.2 새 DTO

`apps/api/src/jobs/dto/create-job.dto.ts`:

```typescript
class CreateJobDto {
  @IsString() @Length(5, 120)            title!: string;
  @IsString() @Length(10, 1000)          description!: string;
  @IsString() @Length(1, 40)             category!: string;
  @IsString() @Length(1, 255)            address!: string;
  @IsNumber() @Min(-90) @Max(90)         latitude!: number;
  @IsNumber() @Min(-180) @Max(180)       longitude!: number;
  @IsISO8601()                            startAt!: string;
  @IsISO8601()                            endAt!: string;
  @IsInt() @Min(10030) @Max(1_000_000)   hourlyWage!: number;
  @IsInt() @Min(1) @Max(50)              recruitCount!: number;
  // estimatedMinutes 는 백엔드가 startAt/endAt 차이로 계산
}
```

`my-jobs-query.dto.ts`:

```typescript
class MyJobsQueryDto {
  @Type(() => Number) @IsOptional() @IsInt() @Min(1)         page?: number = 1;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(50) limit?: number = 20;
}
```

### 4.3 `JobsService` 확장

```typescript
class JobsService {
  // 기존 search / findOne 그대로

  async createForClient(clientId: bigint, dto: CreateJobDto): Promise<Job> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt) throw new BadRequestException('INVALID_TIME_RANGE');
    if (startAt < new Date()) throw new BadRequestException('START_IN_PAST');
    const estimatedMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);

    return this.prisma.job.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        address: dto.address,
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
        startAt,
        endAt,
        hourlyWage: dto.hourlyWage,
        estimatedMinutes,
        recruitCount: dto.recruitCount,
        // PostGIS location 은 DB 트리거로 lat/lng 에서 동기화
      },
    });
  }

  async findMyJobs(clientId: bigint, query: MyJobsQueryDto): Promise<{ items: Job[]; total: number; page: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where: { clientId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where: { clientId, deletedAt: null } }),
    ]);
    return { items, total, page };
  }
}
```

### 4.4 `JobsController` 확장

```typescript
@Controller('jobs')
@UseGuards(JwtAuthGuard)
class JobsController {
  // 기존 search / findOne 그대로

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: CurrentUserContext, @Body() dto: CreateJobDto) {
    if (user.role !== 'CLIENT') throw new ForbiddenException('CLIENT_ONLY');
    const job = await this.jobs.createForClient(user.id, dto);
    return toJobApiShape(job);
  }

  @Get('my')
  async myJobs(@CurrentUser() user: CurrentUserContext, @Query() query: MyJobsQueryDto) {
    if (user.role !== 'CLIENT') throw new ForbiddenException('CLIENT_ONLY');
    const result = await this.jobs.findMyJobs(user.id, query);
    return {
      ...result,
      items: result.items.map(toJobApiShape),
    };
  }
}
```

> `toJobApiShape` 는 BigInt → string, Decimal → number 변환 헬퍼. `findOne` 의 응답 매핑과 중복 — 추후 `jobs/mapper.ts` 로 추출.

### 4.5 role 가드 데코레이터 (선택)

NestJS `@Roles('CLIENT')` 데코레이터 + `RolesGuard` 를 도입할지, 인라인 `if` 만 쓸지. 1차는 **인라인** — 코드 양 작음, 가드 인프라 도입은 후속 (W4 에서 적극 활용 시 도입).

### 4.6 기존 코드 영향

- `JobsModule` 변경 없음
- `JobsService.search` / `findOne` 시그니처 그대로 — 워커앱·기존 spec 무영향

---

## 5. 카카오 로컬 API 통합

### 5.1 endpoint

```
GET https://dapi.kakao.com/v2/local/search/address.json?query={address}&size=5
Headers: Authorization: KakaoAK {KAKAO_REST_API_KEY}
```

응답:

```json
{
  "meta": { "total_count": 1 },
  "documents": [
    {
      "address_name": "서울 중구 세종대로 110",
      "x": "126.97791",           // longitude
      "y": "37.56635",            // latitude
      "road_address": {
        "address_name": "서울 중구 세종대로 110",
        "road_name": "세종대로",
        "main_building_no": "110"
      }
    }
  ]
}
```

### 5.2 `apps/web/src/shared/api/kakaoLocalClient.ts`

```typescript
import axios from 'axios';
import { env } from '@/shared/config/env';

interface KakaoAddressResult {
  addressName: string;
  latitude: number;
  longitude: number;
}

export async function searchAddress(query: string): Promise<KakaoAddressResult | null> {
  if (!env.KAKAO_REST_API_KEY) throw new Error('KAKAO_REST_API_KEY not configured');
  const { data } = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
    params: { query, size: 5 },
    headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
    timeout: 5_000,
  });
  const doc = data.documents?.[0];
  if (!doc) return null;
  return {
    addressName: doc.road_address?.address_name ?? doc.address_name,
    latitude: Number(doc.y),
    longitude: Number(doc.x),
  };
}
```

### 5.3 env 추가

`apps/web/.env.local` (gitignored):
```dotenv
NEXT_PUBLIC_KAKAO_REST_API_KEY=70d8db6c99799796a660966c718f3d6d
```

`apps/web/.env.example` (신규):
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_KAKAO_REST_API_KEY=your-kakao-rest-api-key
```

### 5.4 API 키 노출 위험

- 카카오 REST API key 는 카카오 콘솔의 **허용 도메인 / IP 제한** 기능으로 보호
- 1차 dev 에서는 모든 origin 허용. 운영 진입 전 도메인 제한 강화 (`localhost`, 운영 도메인만)
- plan §11 R3 참조

---

## 6. FSD 구조 (apps/web)

```
src/
├── app/
│   ├── home/page.tsx              (갱신)
│   ├── jobs/
│   │   ├── page.tsx               ★
│   │   ├── new/page.tsx           ★
│   │   └── [id]/page.tsx          ★
├── features/
│   ├── job-create/                ★ 신규
│   │   ├── api/useCreateJobMutation.ts
│   │   ├── lib/validateJobForm.ts
│   │   ├── ui/
│   │   │   ├── JobCreateForm.tsx
│   │   │   └── AddressSearchField.tsx
│   │   └── index.ts
│   └── job-list/                  ★ 신규
│       ├── api/useMyJobsQuery.ts
│       ├── ui/
│       │   ├── JobListCard.tsx
│       │   └── JobListPager.tsx
│       └── index.ts
├── entities/
│   └── job/                       ★ 신규
│       ├── api/useJobDetailQuery.ts
│       ├── model/types.ts         (Job, JobStatus, JobApiResponse)
│       ├── lib/formatJobTime.ts
│       └── index.ts
└── shared/
    ├── api/
    │   ├── kakaoLocalClient.ts    ★ 신규
    │   └── ... (기존)
    └── ui/
        ├── Modal.tsx              (필요 시)
        └── ... (기존)
```

### 6.1 의존 방향 (FSD 단방향 검증)

```
app/jobs/new/page.tsx     → features/job-create   → entities/job + shared/{api, ui}
app/jobs/page.tsx         → features/job-list     → entities/job + shared/{api, ui}
app/jobs/[id]/page.tsx    → entities/job          → shared/{api, ui}
shared/api/kakaoLocalClient → 외부 axios 호출만 (다른 layer 의존 없음)
```

- features 간 import 없음 (`job-create` 와 `job-list` 분리)
- `entities/job` 가 두 features 의 공유 도메인 (Job 타입, JobStatus 표시 헬퍼)

### 6.2 Public API (index.ts)

| Slice | export |
|---|---|
| `entities/job` | `useJobDetailQuery`, `formatJobTime`, `Job`, `JobStatus`, `JobApiResponse` |
| `features/job-create` | `JobCreateForm`, `useCreateJobMutation` (+ `validateJobForm` 내부) |
| `features/job-list` | `JobListCard`, `JobListPager`, `useMyJobsQuery` |
| `shared/api` | (기존 + `searchAddress` re-export) |

---

## 7. API 계약

### 7.1 `POST /jobs`

**Auth:** `Authorization: Bearer <access>` (role=CLIENT 전용)

**Request:**

```json
{
  "title": "카페 홀 서빙 (1시간)",
  "description": "오후 피크 타임 1시간 서빙 도와주실 분 모집합니다.",
  "category": "F&B",
  "address": "서울 중구 세종대로 110",
  "latitude": 37.56635,
  "longitude": 126.97791,
  "startAt": "2026-05-22T15:30:00+09:00",
  "endAt": "2026-05-22T16:30:00+09:00",
  "hourlyWage": 12000,
  "recruitCount": 1
}
```

**Response (201):** 생성된 Job (findOne 응답과 동일 shape — `client` 정보 포함).

**Errors:**

| HTTP | code | 시나리오 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 |
| 400 | `INVALID_TIME_RANGE` | startAt >= endAt |
| 400 | `START_IN_PAST` | startAt < now |
| 401 | `UNAUTHENTICATED` | JWT 누락 |
| 403 | `CLIENT_ONLY` | role !== 'CLIENT' |

### 7.2 `GET /jobs/my`

**Auth:** Bearer + role=CLIENT

**Query:** `?page=1&limit=20`

**Response (200):**

```json
{
  "items": [ /* Job[] */ ],
  "total": 42,
  "page": 1
}
```

**Errors:** `401 UNAUTHENTICATED`, `403 CLIENT_ONLY`

### 7.3 `GET /jobs/:id`

기존 그대로. 누구든 (인증된 사용자) 조회 가능. `client_id !== currentUser.id` 인 경우의 가드는 클라이언트 UX 차원에서만 적용 (백엔드는 워커도 상세 조회 가능 — 매칭 흐름에서 필요).

---

## 8. 테스트 계획

### 8.1 백엔드 단위 테스트 (`apps/api`)

| 대상 | 파일 | 케이스 |
|---|---|---|
| `JobsService.createForClient` | `jobs.service.spec.ts` (신규) | 정상 생성 / `startAt >= endAt` 400 / `startAt < now` 400 / `estimatedMinutes` 자동 계산 |
| `JobsService.findMyJobs` | 동일 | 본인 공고만 / soft-deleted 제외 / 페이지네이션 정확 |
| `JobsController` 가드 | (선택) | role=WORKER → 403 / 미인증 → 401 — 인라인 가드는 service spec 으로도 커버 가능 |

### 8.2 프론트엔드 단위 테스트 (`apps/web`)

| 대상 | 파일 | 케이스 |
|---|---|---|
| `validateJobForm` | `features/job-create/lib/__tests__/validateJobForm.test.ts` | 각 필드 경계값 + 시간 범위 + 시급 최저 + 시작 시점 |
| `useCreateJobMutation` | `features/job-create/api/__tests__/useCreateJobMutation.test.tsx` | 201 OK 시 router push / 400 / 403 |
| `useMyJobsQuery` | `features/job-list/api/__tests__/useMyJobsQuery.test.tsx` | 200 OK / 401 / empty |
| `kakaoLocalClient.searchAddress` | `shared/api/__tests__/kakaoLocalClient.test.ts` | 정상 / 빈 결과 / 네트워크 실패 / key 미설정 |
| `formatJobTime` | `entities/job/lib/__tests__/formatJobTime.test.ts` | KST 포맷 / 같은 날 / 다른 날 |

### 8.3 수동 통합 검증

- [ ] 시드 사업주 로그인 → `/home` → "공고 등록"
- [ ] 폼 입력 → "주소 확인" → 카카오 결과로 좌표 채워짐
- [ ] 등록 → `/jobs/[id]` 로 이동, 정보 표시
- [ ] `/jobs` 진입 → 방금 등록한 공고가 목록에 표시
- [ ] 잘못된 시간 범위 입력 → 인라인 검증 메시지
- [ ] 잘못된 주소 → "검색 결과 없음" 메시지
- [ ] 워커 계정 로그인 → `/jobs` 접근 시 403 → /login (모바일 워커앱은 별도, 여기는 apps/web 우회 차단)

### 8.4 완료 기준

- 위 단위 테스트 전부 PASS
- 수동 검증 7항목 통과
- `pnpm --filter @pinch/api typecheck && test:unit` PASS (기존 + 신규)
- `pnpm --filter @pinch/web typecheck && lint && build && test` 모두 PASS
- 기존 모바일/api 테스트 회귀 없음

---

## 9. 작업 단계 (Atomic Commits)

브랜치: `feat/job-management`

### 9.1 Phase A — 백엔드

| # | 커밋 | 변경 |
|---|---|---|
| A1 | `feat(api): CreateJobDto + MyJobsQueryDto` | `apps/api/src/jobs/dto/{create-job, my-jobs-query}.dto.ts` |
| A2 | `feat(api): JobsService.createForClient + findMyJobs` | `apps/api/src/jobs/jobs.service.ts` |
| A3 | `feat(api): POST /jobs + GET /jobs/my (CLIENT 전용)` | `apps/api/src/jobs/jobs.controller.ts` |
| A4 | `test(api): jobs.service.spec — create / findMy 검증` | `apps/api/src/jobs/jobs.service.spec.ts` (신규) |

### 9.2 Phase B — 공유 / entities

| # | 커밋 | 변경 |
|---|---|---|
| B1 | `feat(web): shared/api/kakaoLocalClient + env 추가` | `apps/web/src/shared/api/kakaoLocalClient.ts`, `apps/web/src/shared/config/env.ts`, `.env.example` 신규 |
| B2 | `feat(web): entities/job — types + useJobDetailQuery + formatJobTime` | `apps/web/src/entities/job/**` |

### 9.3 Phase C — features

| # | 커밋 | 변경 |
|---|---|---|
| C1 | `feat(web): features/job-create slice (form + mutation + validate)` | `apps/web/src/features/job-create/**` |
| C2 | `feat(web): features/job-list slice (card + pager + query)` | `apps/web/src/features/job-list/**` |

### 9.4 Phase D — pages

| # | 커밋 | 변경 |
|---|---|---|
| D1 | `feat(web): /jobs 목록 + /jobs/new 등록 페이지` | `apps/web/src/app/jobs/{page, new/page}.tsx` |
| D2 | `feat(web): /jobs/[id] 상세 페이지` | `apps/web/src/app/jobs/[id]/page.tsx` |
| D3 | `refactor(web): /home — 공고 관리 진입 카드` | `apps/web/src/app/home/page.tsx` |

### 9.5 Phase E — 테스트

| # | 커밋 | 변경 |
|---|---|---|
| E1 | `test(web): validateJobForm / useCreateJobMutation` | `apps/web/src/features/job-create/__tests__/**` |
| E2 | `test(web): useMyJobsQuery / kakaoLocalClient / formatJobTime` | `apps/web/src/{features/job-list, shared/api, entities/job}/__tests__/**` |

### 9.6 Phase F — 문서 동기화

| # | 커밋 | 변경 |
|---|---|---|
| F1 | `docs(spec): API명세 v0.5.0 + 설계서 §3.2 갱신` | `.claude/docs/API명세.md`, `.claude/설계서.md` |

> 각 Phase 마다 typecheck + 해당 영역 test 통과 후 다음으로. 위험 작업 분할 원칙.

---

## 10. 위험 요소 및 가정

| # | 항목 | 영향 | 대응 |
|---|---|---|---|
| R1 | 카카오 REST API key 가 클라이언트에 노출 (NEXT_PUBLIC_*) | 키 도용 위험 | 카카오 콘솔의 도메인/IP 제한. 1차 dev 한정. plan §5.4 노트 |
| R2 | 사업주가 잘못된 좌표 입력 (검색 결과 무시) | 워커 출퇴근 GPS 검증 오작동 | 1차는 검증 책임 사업주. 좌표 read-only + "주소 확인 필수" UX |
| R3 | 카카오 API 일시 장애 | 등록 불가 | "주소 확인 실패 — 잠시 후 다시 시도" 안내. 수기 좌표 입력은 1차 미지원 |
| R4 | 시작 시각이 과거인 공고 | 워커앱에서 검색 안 됨 (`start_at > now`) | 백엔드 `START_IN_PAST` 400 |
| R5 | 시급이 최저시급 미만 | 법적 문제 | 1차 검증: 2026 최저시급 10,030 원 하한 (`@Min(10030)`). 매년 갱신 필요 — 별도 const 또는 설정 |
| R6 | `estimatedMinutes` 가 매우 큰 값 (24시간 초과) | 정산 비정상 | 24h 상한 추가 (1440분). 1차에서는 검증 없음 — R5 와 묶어 후속 |
| R7 | `client.role` 변경된 사용자가 사업주 공고 진입 시도 | 데이터 노출 | `POST /jobs` 와 `GET /jobs/my` 의 `CLIENT_ONLY` 가드. role 변경은 admin 만 |
| R8 | 빈 `addMyJobs` 페이지에 사용자가 머묾 | UX 빈약 | empty state + CTA |
| R9 | Job 의 `category` 자유 입력으로 인한 데이터 일관성 저하 | 검색·통계 어려움 | datalist 추천 + 카테고리 정식화는 운영 데이터 분석 후 |
| R10 | apps/web 의 vitest 가 jsdom/happy-dom 환경에서 axios 의 직접 호출 (kakaoLocalClient) 시 fetch 모킹 부담 | 테스트 작성 비용 | vi.spyOn(axios, 'get') 으로 단순 mock |
| R11 | apps/web 의 jobs 페이지가 SSR 가능성 검토 | SEO 불필요, 인증 후 사용 | 모두 client component ('use client') |
| R12 | 작업 범위가 매우 큰 위험 작업 (백엔드 + frontend 교차, 다중 slice) | 누락 위험 | Phase A~F 분할, 각 Phase 게이트 |

---

## 11. 후속 작업 (별도 PR)

| 후속 # | 제목 | 사유 |
|---|---|---|
| W3.1 | 공고 수정·삭제·모집 마감 | 상태 전환 정책 정밀 설계 후 |
| W3.2 | 카카오맵 SDK 지도 위젯 + 다중 좌표 결과 선택 | UX 강화 |
| W3.3 | 공고 템플릿 저장·재사용 | 운영 패턴 분석 후 |
| W3.4 | 공고 이미지 첨부 | Storage 인프라 결정 |
| W3.5 | 사업주 공고 검색·필터·정렬 옵션 | 공고 수 증가 시 |
| W4 | 출퇴근 실시간 모니터링 | apps/web 핵심 다음 단계 |

---

## 12. 참고 자료

- 카카오 로컬 API (주소 → 좌표): https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-address
- 기존 plan: `.claude/plans/03-web-client-bootstrap.md`
- 백엔드 정찰: `apps/api/src/jobs/jobs.service.ts`
- FSD: `.claude/rules/frontend-architecture.md`
- 2026 최저시급 (KR): https://www.minimumwage.go.kr
