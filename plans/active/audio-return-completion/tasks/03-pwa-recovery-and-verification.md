# Phase 2 / Step 03 — 오디오 복귀 이벤트 관리

## What to Build

중복 focus/visible, 저장 지연 중 완료 계산, 새 실행 후 이전 응답 도착을 테스트한다. 실행 식별자와 로컬 복귀 시각을 유지하는 작은 조정 로직을 lib/에 구현한다. hook/UI 연결은 Step 04에서 한다.

## Acceptance Criteria

- [x] focus/visible이 연속 발생해도 같은 실행의 저장은 중복되지 않는다.
- [x] 첫 유효 복귀 시각이 DB 응답 전에 확보된다.
- [x] 새 실행을 오래된 응답으로 덮어쓰지 않는다.
- [x] 무관한 focus/초기 로드를 실제 복귀로 오인하지 않는다.
- [x] 복귀 저장 오류를 호출자에게 알리고 수동 완료를 막지 않는다.
- [x] 활성 프로필 밖의 기록과 이미 복귀한 실행을 불필요하게 저장하지 않는다.

## Required Verification

테스트 먼저 작성 → RED → 구현 → GREEN. 관련 test:unit/typecheck/check:contracts 결과를 기록한 뒤 step 커밋.

## Blocked By

[Step 01](01-reproduce-and-contract.md), [Step 02](02-refactor-save-and-return.md).

## TDD Result

- tests-first RED: 새 API 누락으로 컴파일 실패. 이전 의미의 중간 구현에서 신규 26개 중 23개 행동 assertion 실패.
- GREEN: coordinator 23개와 조회 store 3개 추가 검사 통과. 전체 84개 테스트 통과.
- 테스트 pane에서 typecheck/check:contracts/check:pwa 통과.
- 172줄 coordinator로 첫 복귀 시각 선공개, 중복 이벤트 차단, 이전 응답 배제, 조건 충돌 조회, 동일 시각 재시도를 구현했다.
- 숨김/blur 이탈 근거 없이 초기 focus를 복귀로 처리하지 않는다. 복귀 저장과 수동 완료를 분리했고 owner/활성 배정 범위를 유지했다.
- 실제 DOM 이벤트/hook 연결은 Step 04에서 수행한다.
