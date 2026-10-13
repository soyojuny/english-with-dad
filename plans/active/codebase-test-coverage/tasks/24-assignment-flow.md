# Step 24 — 배정 생성·갱신·편집·삭제 흐름

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

날짜×선택 자료 batch 생성, 활동 구분/횟수/퀴즈, 동일 키 재배정·생성 수 표시, 예정 배정 편집/삭제와 local cache 정리를 검사한다.

대상 코드:

- app/reading-manager-client.tsx:할 일 배정 흐름

예상 산출물: tests/browser/assignment-flow.spec.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 여러 날짜·자료·활동 배정 | HTTP payload와 아동/예정 화면에 정확한 항목을 반영한다 |
| 경계 | 하루·퀴즈 전용·필사·단어 읽기·영어 그림책·동일 키 갱신 | 자료별 규칙·퀴즈 기본 N·영어 그림책 읽기 1회와 중복 없는 UI 병합을 확인한다 |
| 잘못된 입력/실패 | 종료일 역전·아동 없음·활동/횟수 미선택·저장/삭제 실패 | 안내하고 잘못된 payload나 성공 상태를 만들지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] DB upsert의 실제 충돌 해소나 cascade는 검증했다고 주장하지 않는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 05](./05-dates-periods.md)
- [Step 07](./07-materials-candidates.md)
- [Step 14](./14-store-assignment-log-write.md)
- [Step 19](./19-assignment-components.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
