# Step 08 — 횟수·진행률·활동 기록

## Status

Complete — 2026-10-14 최종 review와 Phase 1 경계 verify까지 PASS. 제품 코드는 변경하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

횟수 fallback·task 구성·정렬·진행률·퀴즈·활동 로그와 완료 표시 정책을 검증한다. PASS와 FAIL은 둘 다 결과 기록으로서 퀴즈 완료에 포함하는 현재 계약을 명시한다.

대상 코드:

- lib/reading-calculations.ts
- lib/reading-data.ts
- lib/child-task-policy.ts

예상 산출물: tests/reading-calculations.test.ts; tests/child-task-policy.test.ts 확장.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 읽기·정따·스스로·필사·단어 읽기·퀴즈 | 시간·횟수·활동 구분과 진행률을 올바르게 기록한다 |
| 경계 | 0회·목표 초과·퀴즈 전용·비활성 퀴즈·자료 누락 | 진행률 상한, 빈 과제, 누락 자료 처리와 라벨을 확인한다 |
| 잘못된 입력/실패 | 중복/오래된 snapshot·loading/error 상태 | 완료 횟수를 퇴행시키지 않고 로딩 실패와 기록 없음을 구별한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 오디오 링크 열기나 복귀 자체를 완료로 계산하지 않는 규칙을 유지한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] root 최종 unit·contracts·diff check, final Standards/Spec, Phase 1 boundary verify 결과를 기록했다.

## Required Verification

- npm run test:unit
- npm run check:contracts

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | D07: `정상 입력: getAssignmentTaskCount는 명시 횟수를 우선한다`, `경계값: getAssignmentTaskCount는 legacy task 존재를 1회로 fallback한다`, `경계값: getAssignmentTaskCount는 배정되지 않은 task에 0을 반환한다`; `경계값: buildAssignmentTaskCounts는 category의 0회 task를 제외한다`, `경계값: buildAssignmentTaskCounts는 category 밖 task를 제외한다`, `정상 입력: buildAssignmentTaskCounts는 명시 선택 task만 남긴다`; `정상 입력: getCompletionCount는 assignment:task 복합 key의 기록 횟수를 읽는다`, `경계값: getCompletionCount는 기록 없는 task에 0을 반환한다`; `경계값: countAssignmentProgress는 목표 초과 완료를 cap한다`, `경계값: countAssignmentProgress는 0 task에 0%를 반환한다`; quiz pending/PASS/FAIL/disabled 4개 test와 format 8개 test; `경계값: 목표 2회 중 1회 완료는 오디오 수동 완료 버튼을 계속 표시한다`를 포함한 child policy GWT. D08: `정상 입력: 활동 기록은 유효 배정의 복합 key와 입력 순서대로 task와 FAIL 퀴즈를 연결한다`과 자료 누락 test; valid regular focusListen, regular copywork, word-book-1 wordRead fixture. |
| 실행 명령/결과 | root 최종 2026-10-14 `npm run test:unit` exit 0 (9개 발견 파일 PASS, fail/skip/todo 0; `verification-artifacts/step08-unit-root-final.log`); `npm run check:contracts` exit 0; `git diff --check` exit 0. final Standards 0 findings, final Spec 0 findings. Phase 1 경계 `npm run verify` exit 0(check:contracts/check:sw/check:pwa/unit/typecheck/build 전체 PASS; `verification-artifacts/phase01-verify.log`). Step 02의 신규 파일 발견·실패 exit·독립 fixture 증거를 재사용한다. |
| 신규 동작/기존 동작 | 제품 동작은 변경하지 않았다. P1 invalid fixture를 유효 도메인 배정 3개로 교체했고, P2 부분 완료 button 회귀를 복원했다. 후속 Standards finding의 task count·builder·completion/progress·policy/merge 결합 case도 독립 GWT test로 분리했으며 final Standards 0 findings, final Spec 0 findings으로 해소를 확인했다. |
| 결함 재현 RED → GREEN | 활동 로그 note의 UTC 기대값이 로컬 `formatTime` 계약과 달라 최초 unit FAIL이었다. `Z` fixture를 고정 local datetime으로 바꿔 환경 독립 `00:xx`를 검증했고 재실행 GREEN; 이는 테스트 fixture 오류이며 제품 결함·제품 수정은 없다. |
| 미검증·제외·후속 | 타입 밖 task/category/log 객체는 UI 경로에 없고 `as any`를 쓰지 않았다(D07/D08 invalid N/A). 외부 row 검증은 S01, 저장 count 오류는 S07, 링크 실행/실기기 흐름은 U06/25에 남긴다. Phase 1 boundary verify는 완료했으며, UI/browser 후속 step은 남긴다. |
