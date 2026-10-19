# Step 31 — 개발 하네스 스크립트 회귀

## Status

Complete — 신규 focused 59 PASS, 독립 전체 harness 87 PASS와 typecheck/contracts/PWA/diff 검사 및 최종 Standards/Spec 0/0 findings를 확인했다 (2026-10-19). Step31a는 아직 미착수다.

## Phase

Phase 7 — 하네스와 최종 검증.

## What to Build

하네스의 중요한 성공/거부 경로를 별도 임시 디렉터리에서 child process로 확인한다. git wrapper는 가짜 git 실행 파일과 임시 로컬 repo를 써 인자·오류 전달만 확인하고 remote push는 하지 않는다. Next/CSS/정적 설정은 build·브라우저·기존 contracts로 담당한다.

대상 코드:

- scripts/check-contracts.mjs
- scripts/check-pwa.mjs
- scripts/plan-workflow.mjs
- scripts/plan-archive.mjs
- scripts/git-publish.mjs
- scripts/run-unit-tests.mjs
- next.config.mjs

예상 산출물: tests/harness/*.test.mjs; 임시 repo/plan/public fixture.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 정상 계약/PWA·계획 생성·통과 plan archive·git status | 올바른 메시지/exit 및 임시 fixture 결과를 만든다 |
| 경계 | 필수 파일 누락·archive 중복·pending review·변경 없음 | 거부/멱등/기본 동작을 기록된 계약대로 확인한다 |
| 잘못된 입력/실패 | 잘못된 slug·실패한 git·깨진 manifest | 실패를 전달하며 실제 workspace/remote를 변경하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 테스트 자체가 실제 commit/push/archive나 사용자 파일 삭제를 수행하지 않는다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:harness 제안 명령
- npm run check:contracts
- npm run check:pwa

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

Pending → In Progress → Complete (2026-10-19). 제품 스크립트/설정/의존성 변경 없음.

| 항목 | 기록 |
| --- | --- |
| 테스트 경로 | `tests/harness/static-checks.test.mjs`19개 (T03/T04), `plan-scripts.test.mjs`25개 (T05/T06), `git-publish.test.mjs`15개 (T07); test-only helper `tests/harness/helpers/script-fixture.mjs` |
| focused 명령/결과 | sandbox 밖 `env -u NODE_TEST_CONTEXT node --test tests/harness/static-checks.test.mjs tests/harness/plan-scripts.test.mjs tests/harness/git-publish.test.mjs`: exit0,59 PASS/fail0/skip0/todo0 (1.47s); `verification-artifacts/step31-focused-initial.log` |
| 정적 검사 | `npm run check:contracts`, `npm run check:pwa`, `git diff --check`: PASS; `verification-artifacts/step31-contracts.log`, `step31-pwa.log` |
| 정상·경계·invalid | contracts 정상/필수skill누락/여러위반/120000·120001byte/깨진·없는package; PWA 정상/manifest필드/0·1icon/src누락/자산누락/SW선언·navigation누락/깨진JSON; workflow 분류·skill·추천/중복/빈요청/실패git fallback; archive pass·passed·complete/경로prefix·역슬래시/실제temp move/중복·재실행·pending/shape/status/잘못된slug·없는plan; git status/message argv/변경없음/upstream/무remote·detached/두publish경로/실패add·commit·push/unknown command |
| cwd/import.meta 경계 | 대상5개는 실제 운영 script를 절대경로로 실행하되 cwd를 각 tempfixture로 지정한다. helper 위치해결만 import.meta.url. run-unit-tests.mjs의 import.meta 기반 동작은 기존 `tests/harness/unit-runner.test.mjs`8개(T01) 재사용하며 이번 step에서는 중복구현·재실행하지 않음 |
| 환경·정리·실패 전달 | 모든 script subprocess에서 NODE_TEST_CONTEXT와 상속된 GIT_DIR/WORK_TREE/INDEX_FILE/COMMON_DIR 제거. spawn timeout/signal/error 검사. 각 t.after에서 temp root 제거 및 부재 assert. 정상/실패 각각 독립 fixture, 실패exit는 script 반환값을 assert |
| git 안전 경계 | POSIX fake executable은 per-test exact argv transcript만 허용하고 realgit로 위임하지 않는다. add/commit/push/publish 모두 fake. 실제git은 remote 없는 새temp repo의 init/status만 사용하며 commit/ref/remote 없음을 assert. 실제workspace/remote commit·push 없음 |
| archive 경계 | 실제 rename은 tempfixture의 plans/active/demo→plans/archive/demo만 수행. plan/review/tasks 내용 보존·원본temp경로 제거 확인. 사용자의 실제plan 이동/삭제 없음 |
| 기존 증거 재사용 | unit runner T01 기존8개; next.config.mjs는 기존 build/실제Next+StrictMode 증거에 연결. `step30a-independent-verify.log`의 build PASS 및 `step30a-independent-browser.log`의 Next/Auth4·PWA4 PASS 재사용; 최초 전체browser가 exit1이었다는 기록은 유지 |
| 결함 RED→GREEN | 새 제품 결함/제품수정/skip/expected-fail 없음. invalid fixture의 의도된 script실패는 gate 계약 검증이며 제품결함 RED가 아님 |
| 미검증·제외·인계 | EXDEV cross-device cp/rm fallback, Windows cmd fake executable, 실제remote/commit/push·DB/RLS·실기기는 미검증. Linux/Node22.23.2 현재환경. 전체harness/typecheck/build/verify는 실행하지 않고 독립pane에 인계. commit/push/다른pane제어/Step31a 착수 없음 |
