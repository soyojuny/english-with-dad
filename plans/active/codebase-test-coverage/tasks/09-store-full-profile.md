# Step 09 — 전체·프로필 조회와 row 매핑

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

공개 조회를 통해 private mapper를 검증한다. 모든 ReadingData 컬렉션, snake_case 매핑, 기본값, quiz PASS/FAIL 변환, owner 필터와 정렬·오류 전파를 확인한다.

대상 코드:

- lib/supabase/reading-store.ts:fetchReadingData
- lib/supabase/reading-store.ts:fetchReadingProfileData

예상 산출물: tests/reading-store-read.test.ts; 제한된 query 대역.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 6개 컬렉션과 아동 프로필 조회 | 필요한 row가 도메인 자료와 복합 record key로 변환된다 |
| 경계 | data null·빈 row 목록·허용된 nullable 필드 | 계약에 맞는 빈 컬렉션·기본값을 반환한다 |
| 잘못된 입력/실패 | 각 조회의 DB error·Promise rejection | 부분 성공을 정상 전체 데이터로 처리하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 대표 컬렉션 각각의 오류를 검사하고 owner 필터 누락을 발견하는 대역을 사용한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
