# Phase 1 / Step 01 — 조건부 복귀 저장과 테스트 실행 대상

## What to Build

mock Supabase로 새 실행 이후 이전 복귀 요청이 도착하는 조건을 먼저 검사한다. 복귀 저장을 새 실행 upsert와 구분한 조건부 update로 구현한다. 새 테스트 파일이 모두 test:unit에서 실행되도록 한다. 스키마와 RLS는 유지한다.

## Acceptance Criteria

- [ ] RED: 최신 opened_at과 다른 복귀 요청은 최신 DB 행을 바꾸지 않는다.
- [ ] RED: returned_at이 이미 있으면 최초 복귀 시각을 바꾸지 않는다.
- [ ] 소유자·배정·task·opened_at·미복귀 조건을 모두 검사한다.
- [ ] 반환 행이 없으면 정상적인 충돌 결과로 처리한다. 실제 DB 오류는 호출자에게 전달한다.
- [ ] 실행 저장의 기존 upsert 계약은 유지한다.
- [ ] 새 테스트 파일이 실제 실행되는 것을 결과에서 확인한다.

## Required Verification

테스트 먼저 작성 → RED → 구현 → GREEN. test:unit/check:contracts/typecheck. RED/GREEN 결과를 이 task에 기록한 뒤 step 커밋.

## Blocked By

Step 00 계약 커밋.

## TDD Result

- 테스트를 먼저 작성한 뒤 RED: `saveAudioReturn` export 누락으로 컴파일 실패.
- 기존 `saveAudioLaunch`에 위임한 중간 구현으로 행동 RED 확인: 직접 실행한 store 테스트에서 assertion 9개 실패. 이전 실행 덮어쓰기와 최초 복귀 변경을 검출했다.
- 조건부 update 구현 후 GREEN: store 테스트 13개, 전체 unit 테스트 31개 통과.
- 테스트 pane에서 `npm run test:unit`, `npm run check:contracts`, `npm run typecheck` 모두 통과.
- 실행 저장 upsert, 스키마, RLS는 유지했다.
