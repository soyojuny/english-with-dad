# Step 25 — 아동 학습과 완료·퀴즈 흐름

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

5개 task 유형·퀴즈, 실행/복귀/완료 구분, 목표횟수·시간과 선택 복원, 저장 실패·응답 유실·지연·재시도를 검증한다. 준비된 popup 대역으로 창 열기와 실패 시 현재 계약을 확인한다.

대상 코드:

- app/reading-manager-client.tsx:아동 학습 흐름
- scripts/smoke-audio-completion.mjs

예상 산출물: tests/browser/child-completion.spec.ts; 기존 오디오 시나리오.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 오디오 수동 완료·스스로/필사·단어 읽기·PASS/FAIL | 올바른 횟수/시간/결과를 표시하고 HTTP 저장을 요청한다 |
| 경계 | 복귀 저장 지연·연타·목표 도달·재로드·다른 프로필 | 첫 복귀 시간·요청 중 차단·선택 복원·scope 격리를 확인한다 |
| 잘못된 입력/실패 | 창 열기 실패·저장 실패·응답 유실·결과 조회 실패 | 자동 완료 없이 오류/불확실 상태와 복구 행동을 유지한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 기존 7개 브라우저 회귀를 전부 유지하고 synthetic 이벤트를 실제 Android 복귀 증거로 쓰지 않는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run test:audio-browser
- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 15](./15-store-completion-audio.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 21](./21-selection-hook.md)
- [Step 22](./22-task-request-hook.md)
- [Step 24](./24-assignment-flow.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
