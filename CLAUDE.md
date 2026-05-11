# Project Guidelines

## 문서 작성 및 수정 규칙

문서를 작성하거나 수정할 때 반드시 `.claude/rules/document-template-rule.md`를 먼저 읽고 해당 규격을 따른다.

## 모호한 지시 처리 규칙

사용자의 지시가 모호할 경우 임의로 작업을 시작해서는 안된다. `.claude/rules/unclear-rule.md`를 먼저 읽고 해당 규칙을 따른다.

## 코딩 규칙 + 작업단위 가이드라인

프론트엔드 코드를 작성하거나 수정할 때 반드시 `.claude/rules/frontend-coding-rules.md`를 먼저 읽고 해당 규칙을 따른다.

## 상수·타입 배치

상수 분류, 타입 파일 배치, import 규칙, mapper 패턴은 `.claude/rules/code-organization.md`를 참조한다.

## 기여 규칙 (브랜치 / 커밋 / PR)

브랜치 전략, 커밋 메시지 컨벤션(`<type>(<scope>): <subject>` 구조), PR·코드 리뷰 절차, 제출 전 체크리스트는 `.claude/rules/contributing-role.md`를 따른다.

- 브랜치: Trunk-based Development 지향 (생명주기 1~2일, 피처 플래그 활용)
- 커밋 타입: `feat` / `fix` / `refactor` / `style` / `docs` / `test` / `chore`
- PR: Atomic 단위, 배경(Why) 명시, Self-Review 후 제출