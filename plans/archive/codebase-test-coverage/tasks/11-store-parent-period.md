# Step 11 — 부모 활동 범위 조회

## Status

Complete — 구현·최종 검토·필수 검사를 완료했다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

기간 경계와 assignment/book ID 수집, 후속 .in 조회, 빈 ID일 때 조회 생략, 각 조회 오류를 검증한다. assignment ID는 DB PK라 정상 응답에서 중복될 수 없으므로 dedup은 방어 로직이며 정상 계약으로 주장하지 않는다.

대상 코드:

- lib/supabase/reading-store.ts:fetchParentActivityData

예상 산출물: tests/reading-store-parent.test.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 주·월 범위 기록 | 양 끝 날짜와 해당 배정의 자료·완료·실행을 함께 반환한다 |
| 경계 | 배정 0개·수동 기록만 있음·공유 book ID | 불필요한 빈 in 조회를 피하고 수동 기록을 유지하며 book ID만 dedup한다 |
| 잘못된 입력/실패 | 1차/후속 조회 error | 누락 데이터가 정상 활동표로 보이지 않도록 예외를 전달한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 조회 대역으로 범위/owner/in 필터를 확인하며 실제 DB 접근 권한 검증이라고 표시하지 않는다.
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
| 테스트 경로·시나리오 | `tests/reading-store-parent.test.ts`, S03 — `정상 입력: 부모 활동 조회는 owner와 기간 양 끝을 제한하고 공유 책 ID의 후속 in 조회를 한 번으로 묶는다`, 수동 기록만 있는 빈 배정, 초기/후속 `data null`, `task_counts`/`quiz_enabled`/`content_type` 기본값, 1차·후속 DB error와 대표 Promise rejection을 독립 GWT로 검증 |
| 실행 명령/결과 | root 최종 `npm run test:unit` exit 0, 12개 발견 파일 PASS, fail/skip/todo 0 (`verification-artifacts/step11-unit-root-final.log`); `npm run check:contracts`·`npm run typecheck` exit 0, pane `npm run build` exit 0, `git diff --check` exit 0; 최종 Standards 0 findings, 최종 Spec 0 findings |
| 신규 동작/기존 동작 | 제품 코드는 바꾸지 않고 기존 공개 API의 GREEN 계약을 제한 query 대역으로 추가 |
| 결함 재현 RED → GREEN | 제품 결함 RED는 확인되지 않았고 제품 코드는 수정하지 않음 |
| 미검증·제외·후속 | assignment ID dedup은 PK상 정상 DB 응답 N/A인 방어 로직이며 정상 계약으로 검증하지 않음; 대역은 실제 DB, migration 적용, FK 또는 RLS를 실행하지 않으며 그 증거가 아님 |
