# Step 32 — 통합 검사와 커버리지 공백 점검

## Status

Complete — 2026-10-20 독립 verify:fast·verify:all·test:coverage 및 원본 source/baseline 감사를 모두 통과했다.

## Phase

Phase 7 — 하네스와 최종 검증.

## What to Build

현재 verify를 유지하면서 준비된 component/server/harness를 빠른 검사에 연결하는 비용을 측정한다. browser까지 포함하는 별도 verify:all을 마련한다. 실행되지 않은 원본 파일까지 포함해 커버리지를 보고하며 숫자보다 핵심 시나리오 누락과 미검증 분기를 점검한다. 기존 대비 후퇴 방지는 baseline 측정 후 적용한다.

대상 코드:

- package.json
- tests/
- docs/testing-guidelines.md
- docs/development-harness.md

예상 산출물: 빠른/전체 검사 명령; coverage report; inventory.md/scenarios.md 결과.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 빠른 검사·전체 자동 검사 | 필수 suite 전부가 실제 발견되고 실패가 최종 exit에 전달된다 |
| 경계 | 미import 모듈·단독/전체 실행·고정 timezone 반복 | 0 coverage 모듈과 상태 누출·실행 순서 의존을 드러낸다 |
| 잘못된 입력/실패 | suite 제외·skip/todo·깨진 fixture | 누락을 성공으로 처리하지 않고 해결/제외 이유를 review에 남긴다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 실제 DB/RLS·실기기 미검증을 제외 목록과 함께 보고하며 자동 테스트 완료와 혼동하지 않는다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run verify
- verify:all 제안 명령
- test:coverage 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)
- [Step 03](./03-component-server-harness.md)
- [Step 04](./04-browser-harness.md)
- [Step 05](./05-dates-periods.md)
- [Step 06](./06-drafts-data-contract.md)
- [Step 07](./07-materials-candidates.md)
- [Step 08](./08-tasks-progress-logs.md)
- [Step 09](./09-store-full-profile.md)
- [Step 10](./10-store-child-upcoming.md)
- [Step 11](./11-store-parent-period.md)
- [Step 12](./12-store-library.md)
- [Step 13](./13-store-child-book-write.md)
- [Step 14](./14-store-assignment-log-write.md)
- [Step 15](./15-store-completion-audio.md)
- [Step 16](./16-auth-env-clients.md)
- [Step 17](./17-auth-callback-middleware.md)
- [Step 18](./18-auth-ui.md)
- [Step 19](./19-assignment-components.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 21](./21-selection-hook.md)
- [Step 22](./22-task-request-hook.md)
- [Step 23](./23-profile-material-flow.md)
- [Step 24](./24-assignment-flow.md)
- [Step 25](./25-child-completion-flow.md)
- [Step 26](./26-report-manual-log-flow.md)
- [Step 27](./27-cover-qr.md)
- [Step 28](./28-camera-upload.md)
- [Step 29](./29-service-worker.md)
- [Step 30](./30-mobile-layout.md)
- [Step 31](./31-harness-scripts.md)

## Execution Record

### 루트 최종 독립 검증

| 명령 | 결과 | 로그 |
| --- | --- | --- |
| `npm run verify:fast` | exit 0, 24.83초 | `verification-artifacts/step32-independent-fast.log` |
| `npm run verify:all` | exit 0, 258.86초; 기존 verify도 이 안에서 PASS | `verification-artifacts/step32-independent-all.log` |
| `npm run test:coverage` | exit 0, 15.28초; 원본14/31/31 source 및 baseline PASS | `verification-artifacts/step32-independent-coverage.log` |

unit276/component110/server33/harness99/browser121 모두 일반 PASS, skip/todo/expected-fail 0.
실행 전후 baseline SHA256은 `67f5d3dea2f334c8ef3feb0f09c078095b20a91c938b48ce4f44aefca0d28b38`로 같다.
원본 경로·좌표와 0-hit 파일 감사는 `verification-artifacts/step32-independent-audit.log`에 보존했다.
unit의 6개 미import runtime과 두 Vitest 보고서의 SW0을 수치에서 숨기지 않았다.
루트 lock 대조에서 기존 패키지 버전 변경은 0개이며 새 도구의 dev 의존성만 추가됐다.
독립 및 루트 최종 Standards/Spec 검토에 남은 실질 finding은 없다.
아래 구현·초기 실행 기록은 이 최종 검증과 구분한 이력이다.

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/harness/verification-gates.test.mjs` T08-N01(3 modes)/E01/E02/F01–F06, 12개; 기존 unit-runner 8개 재사용 |
| 실행 명령/결과 | 아래 focused/coverage 표 참조. 실제 전체 verify:fast/verify:all은 독립 pane 대기 |
| 신규 동작/기존 동작 | 기존 verify 보존, fast/all/coverage 고정 순차 npm runner 추가. 앱 제품 동작 변경 없음 |
| 결함 재현 RED → GREEN | 제품 결함 수정 아님. gate invalid/failure는 tempfixture의 의도한 nonzero로 검증 |
| 미검증·제외·후속 | DB/RLS/OAuth·실기기 미검증; 전체 gate 시간·browser runtime 감사·typecheck/build는 독립 pane 수행 |

### 구현·검증 근거 (2026-10-20)

- `verify:fast`: contracts/SW/PWA → unit → component → server → harness → typecheck. build/browser 제외.
- `verify:all`: 기존 verify(unit/typecheck/build 포함) → component → server → harness → 전체 browser 3프로젝트.
- `test:coverage`: unit c8 → component V8 → server V8 → inventory/baseline 검사. 모두 Asia/Seoul, subprocess NODE_TEST_CONTEXT 제거.
- c8 12.0.0과 Vitest/provider 정확히 5.0.4 설치. local CLI help/types와 공식 문서 확인.
- unit TS sourceMap/inlineSources만 추가하고 원래 tsconfig 배열 서식을 보존했다.
- unit14 lib runtime source, component/server 각각 app/lib/middleware/public/sw.js 31 source.
  순수 타입 reading-types/.d.ts·tests/helpers·생성물은 제외한다. scripts/config/static assets는 harness/build/PWA 책임이다.
- `coverage/`는 기존 `.gitignore` 규칙을 확인했다. JSON/HTML/text/summary 보고서가 Git에 들어가지 않는다.
- baseline은 실제 보고서의 파일별 미실행 statement/function/branch 수를 기록했다. 임의 퍼센트 gate 없음.
  layer/metric/count 검증, 새 source·보고서 누락·미실행 수 증가 nonzero, 삭제는 허용한다.
  기존 baseline을 --record로 덮어쓰지 않는다. 도구/새 source baseline 변경은 별도 diff 검토한다.

| 초기 명령/증거 | 결과 | artifact (`verification-artifacts/`) |
| --- | --- | --- |
| sandbox 밖 `env -u NODE_TEST_CONTEXT node --test tests/harness/verification-gates.test.mjs tests/harness/unit-runner.test.mjs` | 20 PASS, fail/skip/todo/cancelled0, 8.92초, exit0 | `step32-focused-harness.log` |
| unit/component/server 최초 별도 coverage | 276/110/33 PASS | `step32-coverage-{unit,component,server}.log` |
| `node scripts/check-coverage.mjs --record` | 실측 최초 baseline 기록, exit0 | `step32-baseline-record.log` |
| sandbox 밖 `env -u NODE_TEST_CONTEXT npm run test:coverage` | unit276/component110/server33 및 baseline PASS, exit0, 순차11.50초 | `step32-coverage-final.log` |
| 원본 source/미import0/skip 감사 | unit supabase/client.ts는 V8 실행 목록에 없고 report0; Vitest SW도 report0; tests/generated/types 제외·source disabled marker0 | `step32-coverage-audit.log` |
| `npm ls --depth=0 c8 vitest @vitest/coverage-v8` | 12.0.0/5.0.4/5.0.4 | `step32-tool-versions.log` |
| `git diff --check` (문서 최종 정리 전) | PASS | 실행 출력 |

| 계층 baseline (서로 합산하지 않음) | statements | branches | functions | lines |
| --- | --- | --- | --- | --- |
| unit | 91.51% | 93.87% | 94.59% | 91.51% |
| component | 27.31% | 27.88% | 24.82% | 28.69% |
| server | 2.61% | 1.22% | 2.85% | 3.12% |

coverage 최종 단계 비용은 unit3.07/component6.71/server1.51/check0.21초다.
빠른/전체 명령의 실제 wall time은 독립 실행 로그에서 확정해야 하며 위 coverage 시간을 그 비용으로 보고하지 않는다.
기존 별도 이력(component3.84초/server0.20초/당시 harness87개10.46초/client113개1.6분)은 참고치다.
T08은 성공3 mode/실패 중단23/잘못된 mode/0hit source/새 source 누락/새 baseline 파일/branch 후퇴/키 오류/덮어쓰기 거부를 확인했다.
실제 새 unit test 발견·실패 exit·stale emit 제거는 기존 8개 fixture를 재사용했다.
미import source가 report0인 사실과 baseline 밖 새 source가 거부되는 사실은 별개로 검증했다.
SW 실제 실행은 Step29 worker/PWA 증거이며 이 수치에 섞지 않는다.
count 기준은 동일 개수로 실행 위치가 바뀐 회귀를 포착하지 못하므로 시나리오 assertion을 유지한다.
root의 동결 지시 이후 source/config/baseline 및 컴파일/cache/coverage 명령을 추가 실행하지 않는다.
독립 verify:fast → verify:all → test:coverage의 현재 source 실행·비용·runtime 감사 뒤 Complete로 전환한다.
commit/push/Step33 착수 없음.
