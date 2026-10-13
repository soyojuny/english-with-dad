# Step 19 — 배정 picker와 편집·퀴즈 컴포넌트

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

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

- [ ] 큰 DOM snapshot 대신 라벨·역할·폼 값·callback을 검증한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

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
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
