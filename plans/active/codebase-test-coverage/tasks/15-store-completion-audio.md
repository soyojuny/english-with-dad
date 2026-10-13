# Step 15 — 완료·실행 저장 기존 회귀 보강

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

이미 존재하는 실패·응답 유실·충돌·이전 응답 배제 사례를 먼저 대응표에 연결한다. 미검증 분기만 보강하고 모의 DB 상태 전이와 실제 DB 보장 범위를 명확히 한다.

대상 코드:

- lib/supabase/reading-store.ts:fetchCompletion
- lib/supabase/reading-store.ts:saveCompletionGuarded
- lib/supabase/reading-store.ts:saveAudioLaunch
- lib/supabase/reading-store.ts:fetchAudioLaunch
- lib/supabase/reading-store.ts:saveAudioReturn
- lib/task-completion.ts
- lib/audio-return.ts

예상 산출물: 기존 completion-store/audio-return-store/task-completion/audio-return 테스트.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 수동 완료와 복귀 저장 | 횟수 1 증가 및 첫 복귀 시각을 보존한다 |
| 경계 | 연타·결과 조회 지연·오래된 요청·dispose | 재저장/퇴행/다른 scope callback을 방지한다 |
| 잘못된 입력/실패 | 확정 저장 실패와 결과 불명확 | 같은 시도로 재시도하거나 조회하며 오류 상태를 구분한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 기존 강한 회귀 테스트를 재작성하지 않고 신규 분기·시나리오만 추가한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run test:audio-browser (도구 준비 후)

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)
- [Step 08](./08-tasks-progress-logs.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
