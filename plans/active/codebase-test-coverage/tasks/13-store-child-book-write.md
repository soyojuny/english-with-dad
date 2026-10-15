# Step 13 — 아동·자료 저장과 활성 상태

## Status

Complete — 최종 검토와 요청된 검증을 완료했다.

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

- [x] insert/update 경계와 owner 범위를 검사하고 입력 검증은 UI 책임과 구분한다.
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
| 테스트 경로·시나리오 | `tests/reading-store-material-write.test.ts`; S05 — 신규/기존 아동·일반 책·단어 읽기 책 저장, 비활성 책 수정, 비활성화/재활성화, DB error·data null·Promise rejection |
| 실행 명령/결과 | `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run test:unit` exit 0, 14 discovered files, fail/skip/todo 0; `npm run check:contracts`, `npm run typecheck`, 이전 개발 pane의 `npm run build`, `git diff --check` 모두 exit 0. |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. 제한 mutation 대역이 exact table/payload/filter/select/single, 예상 밖·중복·미실행 mutation을 실패시키며 저장 row를 공개 도메인 API 결과로 확인한다. |
| 결함 재현 RED → GREEN | 제품 결함 RED 없음. 입력 유효성은 UI 책임으로 분리했으며 타입 밖 입력을 만들지 않았다. |
| 최종 검토 | Standards review 0 findings; Spec review 0 findings. |
| 미검증·제외·후속 | 대역은 실제 DB, migration 적용 또는 RLS를 실행하지 않는다. 일반/단어 읽기 선택 필드는 schema의 non-null 문자열 계약에 따라 빈 문자열을 그대로 보낸다. |
