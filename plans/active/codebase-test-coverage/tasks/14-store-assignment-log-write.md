# Step 14 — 배정·퀴즈·수동 기록 저장

## Status

Complete — 최종 리뷰와 필수 검사를 완료했다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

배정 conflict key와 bulk payload, 횟수/퀴즈 변경, 퀴즈 비활성화 시 결과 null, 수동 기록 저장·삭제, owner 범위·오류를 검증한다. 서로 독립적인 API는 테스트 파일과 시나리오를 나눈다.

대상 코드:

- lib/supabase/reading-store.ts:saveAssignments
- lib/supabase/reading-store.ts:saveAssignmentTaskCounts
- lib/supabase/reading-store.ts:saveAssignmentQuizScore
- lib/supabase/reading-store.ts:deleteAssignment
- lib/supabase/reading-store.ts:saveManualLog
- lib/supabase/reading-store.ts:deleteManualLog

예상 산출물: tests/reading-store-assignment-write.test.ts; tests/reading-store-manual-log.test.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 배정 갱신·PASS/FAIL 저장·수동 기록 CRUD | field 매핑·대상 scope와 반환 row가 맞는다 |
| 경계 | 빈 batch·퀴즈 전용 배정·퀴즈 Y→N | 공개 API의 빈 동작과 quiz_score 초기화를 검사한다 |
| 잘못된 입력/실패 | 각 mutation 거부·없는 반환 row | 오류를 전파하고 성공한 것처럼 화면 상태를 바꿀 근거를 반환하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 실제 unique 제약·cascade·원자성은 mock으로 증명하지 않고 follow-up에 연결한다.
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
| 테스트 경로·시나리오 | `tests/reading-store-assignment-write.test.ts` 및 `tests/reading-store-manual-log.test.ts`, S06 |
| 실행 명령/결과 | root final `TMPDIR="$PWD/verification-artifacts/tmp" npm run test:unit` exit 0, 16 discovered files, fail/skip/todo 0 (`verification-artifacts/step14-unit-root-final.log`); `npm run check:contracts`, `npm run typecheck`, 개발 pane `npm run build`, `git diff --check` 모두 exit 0 |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. 제한 mutation fake가 plan별 `from → mutation → eq → select → single → execute` event sequence, exact payload/options/filter/select/single과 반환 매핑, 빈 batch·quiz Y/N·빈 note/0분·독립 실패 전파를 검증한다. |
| 최종 리뷰 | Standards review 0 findings, Spec review 0 findings. `tests/reading-store-assignment-write.test.ts` 14개와 `tests/reading-store-manual-log.test.ts` 7개, 합계 21개 테스트를 확인했다. 제품 결함은 발견하지 않았다. |
| 미검증·제외·후속 | 실제 DB unique 제약, cascade, transaction atomicity, migration 적용, RLS는 mock으로 증명하지 않았다. `deleteAssignment`의 0행은 현재 SDK response만으로 감지할 수 없어 Q03/후속으로 남긴다. 타입 밖 입력은 공개 TypeScript API 경계에서 만들지 않아 N/A다. |
