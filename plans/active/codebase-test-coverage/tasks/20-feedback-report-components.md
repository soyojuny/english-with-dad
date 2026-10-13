# Step 20 — 완료 안내·활동 셀·자료 표시

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 4 — 컴포넌트와 hook.

## What to Build

완료 상태별 버튼/오류/재시도/확인 callback, 활동 셀 제목·합계·퀴즈·수동 삭제 권한, 표지/단어 읽기 대체 표시와 메타를 검사한다.

대상 코드:

- app/task-completion-feedback.tsx
- app/activity-log-cell.tsx
- app/material-thumb.tsx

예상 산출물: tests/components/task-completion-feedback.test.tsx; activity-log-cell.test.tsx; material-thumb.test.tsx.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 완료·활동 기록·자료 표시 | 정확한 횟수·시간·결과와 사용자 액션을 표시한다 |
| 경계 | loading/error·목표 도달·empty log·meta 빈 필드 | 빈 상태와 완료/저장 상태를 혼동하지 않는다 |
| 잘못된 입력/실패 | 복귀 오류·결과 불명확·삭제 불가 기록 | 지속 안내와 허용된 버튼만 제공한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 오류 안내의 role과 버튼 disabled/callback을 실제 렌더 결과로 확인한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 08](./08-tasks-progress-logs.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
