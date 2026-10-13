# Step 11 — 부모 활동 범위 조회

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

기간 경계와 assignment/book ID 수집, 후속 .in 조회, 빈 ID일 때 조회 생략, 각 조회 오류를 검증한다.

대상 코드:

- lib/supabase/reading-store.ts:fetchParentActivityData

예상 산출물: tests/reading-store-parent.test.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 주·월 범위 기록 | 양 끝 날짜와 해당 배정의 자료·완료·실행을 함께 반환한다 |
| 경계 | 배정 0개·수동 기록만 있음·중복 ID | 불필요한 빈 in 조회를 피하고 수동 기록을 유지한다 |
| 잘못된 입력/실패 | 1차/후속 조회 error | 누락 데이터가 정상 활동표로 보이지 않도록 예외를 전달한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 조회 대역으로 범위/owner/in 필터를 확인하며 실제 DB 접근 권한 검증이라고 표시하지 않는다.
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
