# Step 02 — 단위 테스트 실행기와 공통 fixture

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 0 — 검증 기반과 실행 환경.

## What to Build

node:test를 유지한다. 최소 도메인 fixture와 제어 가능한 Promise·시계 대역을 마련한다. 컴파일 산출물의 오래된 테스트가 실행되지 않도록 경계를 정하고 신규 테스트 발견과 실패 exit code를 검증한다. 추가 계층이 단위 컴파일 대상에 섞이지 않게 한다.

대상 코드:

- scripts/run-unit-tests.mjs
- tsconfig.test.json
- tests/helpers/completion-supabase-fake.ts

예상 산출물: tests/helpers/; tests/harness/unit-runner.test.mjs; coverage 기준 기록.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 새 단위 테스트 추가 | 명령 한 번으로 신규 파일을 발견하고 실패를 전달한다 |
| 경계 | 테스트 삭제 후 재실행·중첩 디렉터리·0개 테스트 | 오래된 산출물을 실행하지 않고 빈 실행을 성공으로 오인하지 않는다 |
| 잘못된 입력/실패 | 하나의 assertion 실패·컴파일 오류 | 최종 명령이 실패하며 다른 계층 테스트를 잘못 실행하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 기존 6개 테스트 파일이 유지되고 fixture 변경이 테스트 간 상태를 공유하지 않는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run typecheck
- test:harness 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 01](./01-scope-matrix.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
