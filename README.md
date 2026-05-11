# PINCH — 핀치

> "필요한 순간, 한 꼬집의 시간을 채우다" — 한국형 초단기 알바 매칭 플랫폼

**현재 단계:** Slice 1 PoC — 선착순 매칭 동시성 검증

---

## 📚 문서

상세 문서는 [`.claude/`](./.claude/) 하위에 있습니다.

| 문서 | 위치 |
|---|---|
| 설계서 (서비스 전반) | [.claude/설계서.md](./.claude/설계서.md) |
| 실행 가이드 (셋업·시드·부하 테스트) | [.claude/docs/실행가이드.md](./.claude/docs/실행가이드.md) |
| API 명세 (5개 핵심 엔드포인트) | [.claude/docs/API명세.md](./.claude/docs/API명세.md) |
| 프로젝트 규칙 | [.claude/rules/](./.claude/rules/) |

---

## ⚡ 빠른 시작

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate
docker exec -i pinch-postgres psql -U pinch -d pinch_dev < prisma/migrations/post-init.sql
pnpm db:seed
pnpm start:dev
```

자세한 절차는 [실행 가이드](./.claude/docs/실행가이드.md) 참조.

---

## 🛠️ 기술 스택

- **Backend:** NestJS 10 · TypeScript 5.6 · Prisma 5 · PostgreSQL 17 (+ PostGIS)
- **Test:** Jest · k6 (부하 테스트)
- **Infra:** Docker Compose (개발) · AWS (예정)
