# Step 19 — 배정 picker와 편집·퀴즈 컴포넌트

## Status

Complete — 컴포넌트 테스트와 최종 root 검증을 완료했으며, fallback quiz visibility 제품 결함 하나를 regular/wordReading 두 재현의 expected-fail로 보존했다.

## Phase

Phase 4 — 컴포넌트와 hook.

## What to Build

책 추가/제거·검색·시리즈·활동 선택 상태와 form field, 자료별 횟수·퀴즈 표시, 취소/저장 callback, PASS/FAIL 표시를 검사한다.

대상 코드:

- app/assignment-book-picker.tsx
- app/assignment-edit-form.tsx
- app/assignment-quiz-score.tsx

예상 산출물: tests/components/assignment-book-picker.test.tsx; assignment-edit-form.test.tsx; assignment-quiz-score.test.tsx.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 자료 선택과 배정 편집 | 바뀐 활동·횟수·퀴즈 값을 form에 전달한다 |
| 경계 | 선택 자료 제거 후 재추가·자료 유형 변경·task 빈 퀴즈 전용 | stale category와 자료별 fallback·퀴즈 노출 계약을 확인한다 |
| 잘못된 입력/실패 | 미선택 활동·허용되지 않는 조합 | UI가 선택을 제한하며 최종 제출 검증은 Step 24에 연결한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 큰 DOM snapshot 대신 라벨·역할·폼 값·callback을 검증한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 07](./07-materials-candidates.md)
- [Step 08](./08-tasks-progress-logs.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/components/assignment-book-picker.test.tsx`: C01-N01/E01/E02, D06-N02/N03/E02; `tests/components/assignment-edit-form.test.tsx`: C01-N02/N03/N04, C01-E03(빈 일반 책 영어 그림책 listen fallback `0`·quiz Y), D06-E03/E04; `tests/components/assignment-quiz-score.test.tsx`: C02-N01/N02, T01-E07. |
| 실행 명령/결과 | `TMPDIR="$PWD/verification-artifacts/tmp" npm run test:component`: root 6 files/28 PASS + 2 expected-fail, exit 0 (`verification-artifacts/step19-component-root-final.log`). root `npm run check:contracts`, `npm run build`, `git diff --check`는 모두 exit 0. build 완료 후 단독 root `npm run typecheck`도 exit 0. 최초 build와 병렬 typecheck의 TS6053은 `.next/types` 생성물 교체 경합이었고 단독 재실행에서 해소됐다. |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. picker의 시리즈/검색/add/remove, category별 control/name/default, rerender reset과 빈 안내; edit의 기존/변경 FormData·원래 assignment·cancel·fallback 및 빈 일반 책 영어 그림책의 읽기 `assignmentCount:assignment-1:listen` 0회/quiz Y control; quiz의 null/PASS/FAIL callback과 선택 표시, Step 03 T01-E07 StrictMode rerender/unmount를 역할·라벨·form name/value로 검사한다. |
| 확인된 제품 결함과 expected-fail | D06-E03(regular copywork fallback)과 D06-E04(wordReading wordRead fallback)는 하나의 AssignmentEditForm quiz visibility 결함을 각각 재현한다. 두 테스트는 fallback control 종류·값과 현재 노출되는 quiz control의 `N` 값을 먼저 관찰하고, 마지막 quiz 비표시 계약 단언만 `test.fails`로 실패시킨다. fallback 누락·렌더 오류·관찰값 변화는 catch 뒤 정상 종료되어 unexpected pass로 suite를 실패시키며, 제품이 수정되어 계약 단언이 통과해도 unexpected pass로 suite가 실패한다. 제품 코드는 수정하지 않았다. |
| 미검증·제외·후속 | TypeScript 타입상 불가능한 invalid category/task/quiz 값은 `as any`로 만들지 않아 N/A다. 최종 제출 payload 유효성·저장 거부·생성/갱신 흐름은 Step 24 범위다. browser 학습 흐름은 Step 25다. |
