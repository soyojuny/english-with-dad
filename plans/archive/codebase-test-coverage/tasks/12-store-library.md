# Step 12 — 자료 관리·시리즈·배정 이력 조회

## Status

Complete — 최종 검토와 필수 검사를 완료했다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

자료 유형·검색·시리즈·활성 상태 필터와 정렬, series RPC 결과와 RPC 오류 시 현재 fallback, 배정 이력 dedup을 공개 API로 검증한다.

대상 코드:

- lib/supabase/reading-store.ts:fetchBookManageData
- lib/supabase/reading-store.ts:fetchBookSeriesNames
- lib/supabase/reading-store.ts:fetchLibraryData
- lib/supabase/reading-store.ts:fetchAssignedBookIds

예상 산출물: tests/reading-store-library.test.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 자료 검색·시리즈 목록·이력 조회 | 필터와 반환값이 공개 함수 계약과 맞는다 |
| 경계 | 공백 시리즈·중복 이름·빈 목록·RPC fallback | 이름을 정리하고 fallback 조건을 정확히 구분한다 |
| 잘못된 입력/실패 | RPC 및 fallback 조회 모두 실패 | 오류를 숨기지 않으며 검색 필터 특수문자의 현 계약을 검토한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] RPC response error fallback과 RPC Promise rejection의 직접 전파를 기록하고 RPC의 실제 SQL 실행은 후속 검증에 남긴다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 09](./09-store-full-profile.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/reading-store-library.test.ts`; S04 |
| 실행 명령/결과 | root 최종 `npm run test:unit` exit 0, 13개 발견 파일 PASS, fail/skip/todo 0 (`verification-artifacts/step12-unit-root-final.log`); `npm run check:contracts`·`npm run typecheck` exit 0, pane `npm run build` exit 0, `git diff --check` exit 0 |
| 신규 동작/기존 동작 | 공개 API의 select/filter multiset/order/RPC 호출, started/executed query 완료, row 매핑, active-only/empty, manage data null, RPC data null/error null no-fallback·response error fallback 및 fallback error/rejection 전파, ID dedup/data null/empty ID를 제한 대역으로 확인 |
| 결함 재현 RED → GREEN | 제품 결함 RED 없음. 테스트 fixture 타입 오류를 수정한 뒤 전체 검사가 GREEN이며 제품 코드는 변경하지 않음 |
| 미검증·제외·후속 | 대역은 실제 DB/RPC SQL/migration/RLS를 실행하지 않는다. RPC Promise rejection은 현재 구현대로 fallback하지 않고 그대로 전파한다. `%`/`_` 검색 이스케이프 정책은 현재 raw `ilike` 전달 계약(Q02)만 기록 |
