# Phase 2 / Step 03 — 오디오 복귀 이벤트 관리

## What to Build

중복 focus/visible, 저장 지연 중 완료 계산, 새 실행 후 이전 응답 도착을 테스트한다. 실행 식별자와 로컬 복귀 시각을 유지하는 작은 조정 로직을 lib/에 구현한다. hook/UI 연결은 Step 04에서 한다.

## Acceptance Criteria

- [ ] focus/visible이 연속 발생해도 같은 실행의 저장은 중복되지 않는다.
- [ ] 첫 유효 복귀 시각이 DB 응답 전에 확보된다.
- [ ] 새 실행을 오래된 응답으로 덮어쓰지 않는다.
- [ ] 무관한 focus/초기 로드를 실제 복귀로 오인하지 않는다.
- [ ] 복귀 저장 오류를 호출자에게 알리고 수동 완료를 막지 않는다.
- [ ] 활성 프로필 밖의 기록과 이미 복귀한 실행을 불필요하게 저장하지 않는다.

## Required Verification

테스트 먼저 작성 → RED → 구현 → GREEN. 관련 test:unit/typecheck/check:contracts 결과를 기록한 뒤 step 커밋.

## Blocked By

[Step 01](01-reproduce-and-contract.md), [Step 02](02-refactor-save-and-return.md).
