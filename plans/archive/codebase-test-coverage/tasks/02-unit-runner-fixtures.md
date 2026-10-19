# Step 02 — 단위 테스트 실행기와 공통 fixture

## Status

Complete — 2026-10-13 구현·필수 검사 PASS; 루트 Standards/Spec 각 0 findings; 커밋 인계. Step 03은 시작하지 않았다.

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

- [x] 기존 6개 테스트 파일이 유지되고 fixture 변경이 테스트 간 상태를 공유하지 않는다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run typecheck
- npm run test:harness — Step 02에서 도입

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 01](./01-scope-matrix.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | T01-N01/N02/N03, T01-E01~E06, T01-F01~F03. tests/harness/unit-runner.test.mjs 8개 + tests/unit/test-fixtures.test.ts 4개. 상세 Given/When/Then은 테스트 본문과 scenarios.md. |
| 실행 명령/결과 | npm run test:unit exit 0(7개 파일); npm run typecheck exit 0; root의 npm run test:harness exit 0(8 PASS/0 FAIL/0 skip/todo), direct harness 8 PASS. unit 각 emitted 파일 직접 실행은 총 110개 test PASS(기존 6파일 106개 + 신규 4개). review.md에 초기 실패와 최종 결과·로그를 구분했다. |
| 신규 동작/기존 동작 | 러너가 .test-build 정리→tsc→tests/ 발견→Node 실행을 맡는다. noEmitOnError, 루트 tests/*.test.ts 및 tests/unit/**/*.test.ts 경계. deferred를 async-fixtures.ts로 이동; 로컬 fixedClock/readingFixture 도입. 기존 6파일은 유지하고 3파일의 helper import만 변경. |
| 결함 재현 RED → GREEN | 신규 하네스의 NODE_TEST_CONTEXT 상속으로 root 실행 5 FAIL/3 PASS(재귀 skip 및 status 0) → subprocess의 env 복사본에서 해당 값 제거 → 8 PASS. 승인된 테스트 설정 수정이며 제품 결함/제품 코드 수정은 없다. |
| 미검증·제외·후속 | sandbox spawnSync EPERM은 root의 sandbox 밖 실행으로 검증. 테스트별 임시 프로젝트/복사본/symlink를 t.after에서 제거; 시계/Promise/도메인 데이터/query fake는 인스턴스별 독립이고 global Date/timer/env 변경 없음. helper invalid는 실제 Promise 거부로 검증하며 타입 밖 입력을 강제하지 않았다. DB/RLS·실기기 제외 유지. Step 03의 DOM/서버 하네스 및 Step 31의 다른 도구 시나리오는 대기. |
| source 커버리지 baseline | review.md의 Step 02 Coverage Baseline: 전체 app/lib/middleware/SW source와 별도 scripts 범위, unit의 runtime lib 14개 중 7개 로드/7개 미import 실행 0. V8 named function hit 및 미측정 원본 line/branch를 구분하고 임의 퍼센트 gate 없음. |
| 상태 전환·역할 | Pending → In Progress(구현/실패 분석) → Complete(최종 실제 PASS), 2026-10-13. code-review/commit은 root; 개발 pane은 commit/push/Step 03/agent/Herdr를 수행하지 않았다. |
