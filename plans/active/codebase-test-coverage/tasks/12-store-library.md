# Step 12 — 자료 관리·시리즈·배정 이력 조회

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

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

- [ ] 모든 RPC 오류에서 fallback하는 현재 동작을 기록하고 RPC의 실제 SQL 실행은 후속 검증에 남긴다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 09](./09-store-full-profile.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
