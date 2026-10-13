# Step 31 — 개발 하네스 스크립트 회귀

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 7 — 하네스와 최종 검증.

## What to Build

하네스의 중요한 성공/거부 경로를 별도 임시 디렉터리에서 child process로 확인한다. git wrapper는 가짜 git 실행 파일과 임시 로컬 repo를 써 인자·오류 전달만 확인하고 remote push는 하지 않는다. Next/CSS/정적 설정은 build·브라우저·기존 contracts로 담당한다.

대상 코드:

- scripts/check-contracts.mjs
- scripts/check-pwa.mjs
- scripts/plan-workflow.mjs
- scripts/plan-archive.mjs
- scripts/git-publish.mjs
- scripts/run-unit-tests.mjs
- next.config.mjs

예상 산출물: tests/harness/*.test.mjs; 임시 repo/plan/public fixture.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 정상 계약/PWA·계획 생성·통과 plan archive·git status | 올바른 메시지/exit 및 임시 fixture 결과를 만든다 |
| 경계 | 필수 파일 누락·archive 중복·pending review·변경 없음 | 거부/멱등/기본 동작을 기록된 계약대로 확인한다 |
| 잘못된 입력/실패 | 잘못된 slug·실패한 git·깨진 manifest | 실패를 전달하며 실제 workspace/remote를 변경하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 테스트 자체가 실제 commit/push/archive나 사용자 파일 삭제를 수행하지 않는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:harness 제안 명령
- npm run check:contracts
- npm run check:pwa

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
