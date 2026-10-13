# Step 13 — 아동·자료 저장과 활성 상태

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

신규 insert·기존 update payload, owner/id 범위, 자료 유형별 nullable 값 및 저장 row 매핑, 비활성화/재활성화를 검사한다.

대상 코드:

- lib/supabase/reading-store.ts:saveChild
- lib/supabase/reading-store.ts:saveBook
- lib/supabase/reading-store.ts:setBookActive

예상 산출물: tests/reading-store-material-write.test.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 새 항목·기존 항목·활성 상태 변경 | 맞는 mutation과 도메인 반환값을 사용한다 |
| 경계 | 빈 선택 필드·기존 비활성 책 편집 | null/기본값과 active 상태를 계약대로 보존한다 |
| 잘못된 입력/실패 | DB 거부·data null·통신 실패 | 저장 성공처럼 반환하지 않고 입력 UI로 오류를 전달한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] insert/update 경계와 owner 범위를 검사하고 입력 검증은 UI 책임과 구분한다.
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
