# Phase 1 / Step 02 — 완료 저장 요청 관리

## What to Build

완료 payload 계산과 비동기 요청 조정을 lib/로 분리한다. 단일 완료 요청이 지연되거나 실패하는 경우와 연타를 먼저 테스트한다. UI 연결은 Step 04에서 한다.

요청 결과가 불명확한 경우에는 재조회와 지연 응답 처리를 먼저 설계한다. 단순 timeout 후 잠금 해제와 재증가를 하지 않는다. 전체 SDK 설정 변경이나 새 스키마는 기본 범위에 포함하지 않는다.

## Acceptance Criteria

- [x] 같은 활동의 완료 연타가 하나의 진행 요청만 만든다.
- [x] 저장 성공 후 횟수와 시간, 재조회 결과가 일치한다.
- [x] 실패 상태와 재시도 안내가 보이며, 결과 미확정 시 이중 증가를 방지한다.
- [x] 프로필 전환/언마운트 후 지연 응답이 다른 화면 상태를 오염시키지 않는다.
- [x] 외부 링크를 열기만 한 경우와 수동 완료를 구별한다.
- [x] 소유자 필터와 기존 RLS 경계를 유지한다.
- [x] 새 회귀 테스트 파일이 실제 test:unit 실행 대상에 포함된다.

## Required Verification

테스트 먼저 작성 → RED → 구현 → GREEN. 지연/실패 응답을 제어해 단일 요청, 연타, 실패/미확정 후 재시도를 검증한다. test:unit/typecheck/check:contracts 결과를 기록한 뒤 step 커밋.

## Blocked By

[Step 01](01-reproduce-and-contract.md).

## TDD Result

- 테스트 먼저 작성: 새 coordinator/store API 누락으로 컴파일 RED를 테스트 pane에서도 확인했다.
- 이전 저장 의미와 최소 stub에서 행동 RED를 확인했다. 단일 클릭 pending/연타, 실패 재시도, 응답 유실 조회, 늦은 응답/프로필 전환 테스트가 실패했다.
- 순수 payload 계산과 180줄의 완료 coordinator, 소유자 필터 조회, insert/expected-count 조건부 update로 구현했다.
- GREEN: 완료 store 11개, coordinator 16개. 전체 unit 테스트 58개, contracts/typecheck 통과.
- 지연 요청이 서버에 나중에 도착해도 새 count를 되돌리지 않으며 결과 미확정 재시도는 원래 payload를 유지한다.
- 기존 UI 연결은 Step 04로 남겼다. 테스트 대기 helper는 50 turn 이후 실패하여 무한 대기하지 않는다.
