# Step 06 — 초기 데이터와 입력 초안 복사

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

bookToDraft·childToDraft와 빈 초기 데이터의 관찰 가능한 계약을 검증한다. type-only 선언은 typecheck, task/category label과 규칙 대응은 contracts와 행동 테스트로 확인한다.

대상 코드:

- lib/reading-drafts.ts
- lib/reading-data.ts
- lib/reading-types.ts

예상 산출물: tests/reading-drafts.test.ts; 계약 시나리오.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 자료·아동을 초안으로 변환 | 필드가 보존되고 UI에 필요한 값이 있다 |
| 경계 | null 입력·빈 문자열·반복 초안 생성 | 기본값이 맞고 nested audio를 변경해 원본이나 다음 초안을 오염시키지 않는다 |
| 잘못된 입력/실패 | 타입상 불가능한 값 | as any로 인위적 테스트를 만들지 않고 실제 row/폼 경계의 담당 step을 연결한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 새 초안의 audio 참조가 원본 및 다른 초안과 분리되고 타입 계약은 별도 검사에 연결된다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run check:contracts

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
