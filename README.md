# PINCH — 핀치

> "필요한 순간, 한 꼬집의 시간을 채우다" — 한국형 초단기 알바 매칭 플랫폼

**현재 단계:** Slice 2 완료 (출퇴근·정산·리뷰·공고검색) → 모노레포 전환 + 프론트엔드 진입

---

## 🗂️ 모노레포 구조

```
pinch/
├── apps/
│   ├── api/         NestJS 10 + Prisma 5 + PostgreSQL 17 백엔드
│   ├── mobile/      Worker App (React Native + Expo) — 진행 예정
│   └── web/         Client Web (React) — 진행 예정
├── packages/        ui-tokens / api-types / shared-lib — 진행 예정
├── k6/              부하 테스트 (cross-app)
├── docker-compose.yml  PostGIS 컨테이너
├── pnpm-workspace.yaml
└── .claude/         설계 문서·규칙
```

**Backend / Frontend 패키지 분리:** 루트 `package.json` 은 워크스페이스 오케스트레이션만, 각 앱은 자체 의존성 + 스크립트만 보유.

---

## 📚 문서

상세 문서는 [`.claude/`](./.claude/) 하위에 있습니다.

| 문서 | 위치 |
|---|---|
| 설계서 (서비스 전반) | [.claude/설계서.md](./.claude/설계서.md) |
| 실행 가이드 (셋업·시드·부하 테스트) | [.claude/docs/실행가이드.md](./.claude/docs/실행가이드.md) |
| API 명세 (핵심 엔드포인트) | [.claude/docs/API명세.md](./.claude/docs/API명세.md) |
| 디자인 시스템 v0 (토큰·컴포넌트) | [.claude/docs/디자인시스템.md](./.claude/docs/디자인시스템.md) |
| 프로젝트 규칙 (기여·테스트·FSD 등) | [.claude/rules/](./.claude/rules/) |

---

## ⚡ 빠른 시작

```bash
pnpm install                                                  # 워크스페이스 전체 의존성
cp apps/api/.env.example apps/api/.env

pnpm db:up                                                    # PostGIS 컨테이너
pnpm db:migrate                                               # Prisma 마이그레이션 (apps/api)
docker exec -i pinch-postgres psql -U pinch -d pinch_dev \
  < apps/api/prisma/migrations/post-init.sql                  # 트리거·CHECK·부분 인덱스

pnpm db:seed                                                  # 시드
pnpm api:dev                                                  # API 서버 (watch)

# 별도 터미널:
JOB_ID=<X> WORKER_ID_START=<Y> pnpm stress                   # k6 부하 테스트
```

루트 스크립트(`api:dev / db:up / db:seed / stress` 등)는 모두 `pnpm --filter @pinch/api ...` 로 디스패치됩니다.

자세한 절차는 [실행 가이드](./.claude/docs/실행가이드.md) 참조.

---

## 🛠️ 기술 스택

| 영역 | 스택 |
|---|---|
| **Backend** (`apps/api`) | NestJS 10 · TypeScript 5.6 · Prisma 5 · PostgreSQL 17 (+ PostGIS) · Passport JWT |
| **Mobile** (`apps/mobile`, 예정) | React Native + Expo · Expo Router · NativeWind (Tailwind) · Zustand · TanStack Query · axios |
| **Web** (`apps/web`, 예정) | React · Tailwind · 동일 상태/API 라이브러리 |
| **Shared** (`packages/*`, 예정) | `ui-tokens` 디자인 토큰 · `api-types` 백엔드 DTO 공유 · `shared-lib` 도메인 유틸 |
| **Test** | Jest (단위·통합) · k6 (동시성/부하) |
| **Infra** | Docker Compose (개발) · AWS (예정) |

---

## 🎯 진행 상태

| Slice | 범위 | 상태 |
|---|---|---|
| Slice 1 | 선착순 매칭 동시성 PoC | ✅ 200 VU PASS |
| Slice 2 | 출퇴근(QR+GPS) + 3.3% 정산 + 양방향 리뷰 + 위치 기반 공고 검색 | ✅ E2E PASS |
| Slice 3 | 본인인증 (NICE/다날) + 출금 (PortOne) | 외부 인프라 대기 |
| Frontend | apps/mobile (Expo) 시작 + 핵심 화면 | 🔄 다음 |
