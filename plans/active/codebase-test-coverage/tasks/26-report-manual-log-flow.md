# Step 26 — 부모 활동표·수동 기록·출력

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

주간 기본값·월간 전환·이전/다음·아동 변경, 활동 구분/시간/횟수/퀴즈·시리즈 진행률, 부모/아동 수동 기록과 삭제·인쇄를 검증한다.

대상 코드:

- app/reading-manager-client.tsx:활동표/수동 기록/출력 흐름
- styles.css

예상 산출물: tests/browser/parent-report.spec.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 완료 기록과 수동 기록을 부모 화면 조회 | 올바른 아동·기간·활동 칸과 합계를 표시한다 |
| 경계 | 기록 0개·완료 초과·월/연말·퀴즈만 존재·비활성 책 기록 | 빈 상태·진행률 상한과 기록 보존 계약을 확인한다 |
| 잘못된 입력/실패 | 조회/기록 저장/삭제 실패·인쇄 준비 실패 | 기존 자료를 잘못 합치거나 성공으로 안내하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 인쇄는 print media DOM/호출과 복원 상태까지 자동 검사하며 실물 출력 품질은 후속 확인한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 05](./05-dates-periods.md)
- [Step 08](./08-tasks-progress-logs.md)
- [Step 11](./11-store-parent-period.md)
- [Step 14](./14-store-assignment-log-write.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 25](./25-child-completion-flow.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
