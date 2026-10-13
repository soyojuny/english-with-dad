# Step 07 — 자료 준비 상태와 배정 후보

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

자료 유형별 준비 상태, 외부 URL, 활동 구분·task·오디오 링크, 후보 검색·시리즈·정렬·표시 제한, 미래 배정 필터를 표 기반으로 검증한다.

대상 코드:

- lib/reading-calculations.ts

예상 산출물: tests/reading-calculations.test.ts 확장.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 일반 책·단어 읽기 검색과 활동 선택 | 자료별 허용 활동과 링크를 선택한다 |
| 경계 | 검색 없음 10개·검색 있음 20개·중복 선택·배정 이력·공백 | 상한과 포함/제외 규칙이 맞고 입력 배열이 변하지 않는다 |
| 잘못된 입력/실패 | javascript/data URL·깨진 URL | 실제 URL 검증 경계가 거부하며 빈 URL 허용과 필수 입력 검증을 구분한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 책/단어 읽기×활동 구분×task 조합의 유효 사례와 적용 불가 사례를 기록한다.
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
