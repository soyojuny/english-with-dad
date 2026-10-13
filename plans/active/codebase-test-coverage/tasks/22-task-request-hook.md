# Step 22 — 완료·복귀 hook 수명주기

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 4 — 컴포넌트와 hook.

## What to Build

focus/blur/visibility/pageshow listener, 15초 불확실 전환, coordinator 연결과 scope/ID 변경·cleanup을 제어 가능한 시계/Promise로 검사한다.

대상 코드:

- app/use-child-task-requests.ts

예상 산출물: tests/hooks/use-child-task-requests.test.tsx.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 복귀 후 수동 완료·확인·재시도 | 올바른 coordinator 요청과 화면 상태를 연결한다 |
| 경계 | 14,999/15,000/15,001ms·StrictMode 재마운트·scope/ID 변경 | 타이머 경계와 늦은 callback 격리, listener 중복 방지를 확인한다 |
| 잘못된 입력/실패 | 저장/조회 지연·profile 변경 중 응답·unmount | stale 결과를 적용하지 않고 timer와 event listener를 정리한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 실제 15초 대기 없이 hook의 UI 연결과 cleanup을 검증한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령
- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 15](./15-store-completion-audio.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
