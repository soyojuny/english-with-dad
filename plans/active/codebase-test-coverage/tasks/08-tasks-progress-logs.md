# Step 08 — 횟수·진행률·활동 기록

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

횟수 fallback·task 구성·정렬·진행률·퀴즈·활동 로그와 완료 표시 정책을 검증한다. PASS와 FAIL은 둘 다 결과 기록으로서 퀴즈 완료에 포함하는 현재 계약을 명시한다.

대상 코드:

- lib/reading-calculations.ts
- lib/reading-data.ts
- lib/child-task-policy.ts

예상 산출물: tests/reading-calculations.test.ts; tests/child-task-policy.test.ts 확장.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 읽기·정따·스스로·필사·단어 읽기·퀴즈 | 시간·횟수·활동 구분과 진행률을 올바르게 기록한다 |
| 경계 | 0회·목표 초과·퀴즈 전용·비활성 퀴즈·자료 누락 | 진행률 상한, 빈 과제, 누락 자료 처리와 라벨을 확인한다 |
| 잘못된 입력/실패 | 중복/오래된 snapshot·loading/error 상태 | 완료 횟수를 퇴행시키지 않고 로딩 실패와 기록 없음을 구별한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 오디오 링크 열기나 복귀 자체를 완료로 계산하지 않는 규칙을 유지한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run check:contracts

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
