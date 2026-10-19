# Step 21 — 배정 선택 복원 hook

## Status

Complete — hook test, 필수 검증, 최종 두 축 검토를 완료했다.

## Phase

Phase 4 — 컴포넌트와 hook.

## What to Build

sessionStorage 복원·쓰기 시점, owner/child/date scope 변경, loading→ready, 실제 선택과 storage 예외를 검사한다. 이 hook에는 timer, subscription 또는 비동기 continuation이 없어 unmount cleanup은 적용 대상이 아니다.

대상 코드:

- app/use-child-assignment-selection.ts

예상 산출물: tests/hooks/use-child-assignment-selection.test.tsx.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 두 번째 배정 선택 후 다시 mount | 저장된 유효 선택을 첫 배정 fallback보다 먼저 복원한다 |
| 경계 | 데이터 로딩 중 빈 목록·owner/child/date scope 변경·배정 삭제 | 복원을 조기에 소모하거나 이전 scope key에 쓰지 않는다 |
| 잘못된 입력/실패 | storage 읽기/쓰기 예외·다른 child/date의 저장 ID | 사용 가능한 메모리 선택과 정의된 fallback을 유지한다 |
| 확인된 결함 | 다른 child/date assignment ID를 반환 callback에 직접 전달 | hook은 ID 존재만 검사하므로 callback과 storage를 바꾼다; H01-F05/F06 expected-fail로 보존한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 순수 policy 테스트를 반복하기보다 React effect와 storage 연결을 검증한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 08](./08-tasks-progress-logs.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/hooks/use-child-assignment-selection.test.tsx`: H01-E01/N01/N02/E02–E04/F01–F06, H03-N01–N03/E01 (16: 14 passed, 2 expected-fail) |
| 실행 명령/결과 | focused hook 1 file, 14 passed + 2 expected-fail; full component 10 files, 69 passed + 4 expected-fail (`verification-artifacts/step21-component-root-final.log`); typecheck/contracts/build/diff check exit 0; final Standards 0 findings and Spec 0 findings |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. React effect/rerender/action과 sessionStorage read/write, owner-only·child·date 실 scope 전환과 예외를 검증했다. 실제 caller는 `todayAssignments`를 전달해 노출을 제한하지만, hook 반환 callback 자체는 childId/date를 강제하지 않는다. |
| 결함 재현 RED → GREEN | H01-F05/F06은 다른 child/date의 존재하는 assignment ID를 직접 전달해도 callback/storage가 불변이어야 한다는 두 독립 expected-fail이다. 현재 hook이 ID 존재만 검사해 실패하며, 제품 수정은 이 Step 범위 밖이다. 기존 Step 19 `AssignmentEditForm` quiz visibility expected-fail 2개도 root component에 그대로 남는다. |
| 미검증·제외·후속 | unmount cleanup은 timer/subscription/async continuation이 없는 동기 hook이므로 N/A이며 vacuous test를 제거했다. 실제 browser reload/다른 탭 storage 이벤트와 owner/profile 전체 흐름은 browser Step 25 및 후속 UI 흐름에서 검증한다. |
