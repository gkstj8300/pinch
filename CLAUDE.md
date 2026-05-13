# Project Guidelines

## 문서 작성 및 수정 규칙

문서를 작성하거나 수정할 때 반드시 `.claude/rules/document-template-rule.md`를 먼저 읽고 해당 규격을 따른다.

## 모호한 지시 처리 규칙

사용자의 지시가 모호할 경우 임의로 작업을 시작해서는 안된다. `.claude/rules/unclear-rule.md`를 먼저 읽고 해당 규칙을 따른다.

## 코딩 규칙 + 작업단위 가이드라인

프론트엔드 코드를 작성하거나 수정할 때 반드시 `.claude/rules/frontend-coding-rules.md`를 먼저 읽고 해당 규칙을 따른다.

## 프론트엔드 폴더 구조 (FSD)

Worker Mobile(RN+Expo) / Client Web(React) 신규 코드는 `.claude/rules/frontend-architecture.md`의 Feature-Sliced Design 규칙을 따른다.

- 6개 레이어: `app / pages / widgets / features / entities / shared`
- 상위→하위 단방향 의존, 동일 레이어 slice 간 import 금지
- 각 slice 는 `index.ts` 만 외부에 노출 (Public API)

## 구현 및 테스트 가이드

코드를 작성하거나 수정한 직후 반드시 `.claude/rules/test-guide.md`의 테스트 절차를 따른다.

- "구현 후 테스트" 필수 — 성공 시나리오 + 엣지 케이스 모두 검증
- 단위 테스트 커버리지 80% 이상 권장
- 응답 순서: 코드 구현 → 테스트 계획 → 테스트 코드 → 검증 결과 (PASS 확인)
- 테스트 미통과 코드는 '완성'으로 간주하지 않는다

## 상수·타입 배치

상수 분류, 타입 파일 배치, import 규칙, mapper 패턴은 `.claude/rules/code-organization.md`를 참조한다.

## 기여 규칙 (브랜치 / 커밋 / PR)

브랜치 전략, 커밋 메시지 컨벤션(`<type>(<scope>): <subject>` 구조), PR·코드 리뷰 절차, 제출 전 체크리스트는 `.claude/rules/contributing-role.md`를 따른다.

- 브랜치: Trunk-based Development 지향 (생명주기 1~2일, 피처 플래그 활용)
- 커밋 타입: `feat` / `fix` / `refactor` / `style` / `docs` / `test` / `chore`
- PR: Atomic 단위, 배경(Why) 명시, Self-Review 후 제출