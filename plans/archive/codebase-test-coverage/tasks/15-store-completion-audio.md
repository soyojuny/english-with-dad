# Step 15 — 완료·실행 저장 기존 회귀 보강

## Status

Complete — 최종 Standards/Spec 검토와 Phase 2 경계 검증을 완료했다.

## Phase

Phase 2 — Supabase 저장소 대역 검증.

## What to Build

이미 존재하는 실패·응답 유실·충돌·이전 응답 배제 사례를 먼저 대응표에 연결한다. 미검증 분기만 보강하고 모의 DB 상태 전이와 실제 DB 보장 범위를 명확히 한다.

대상 코드:

- lib/supabase/reading-store.ts:fetchCompletion
- lib/supabase/reading-store.ts:saveCompletionGuarded
- lib/supabase/reading-store.ts:saveAudioLaunch
- lib/supabase/reading-store.ts:fetchAudioLaunch
- lib/supabase/reading-store.ts:saveAudioReturn
- lib/task-completion.ts
- lib/audio-return.ts

예상 산출물: 기존 completion-store/audio-return-store/task-completion/audio-return 테스트.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 수동 완료와 복귀 저장 | 횟수 1 증가 및 첫 복귀 시각을 보존한다 |
| 경계 | 연타·결과 조회 지연·오래된 요청·dispose | 재저장/퇴행/다른 scope callback을 방지한다 |
| 잘못된 입력/실패 | 확정 저장 실패와 결과 불명확 | 같은 시도로 재시도하거나 조회하며 오류 상태를 구분한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 기존 강한 회귀 테스트를 재작성하지 않고 신규 분기·시나리오만 추가한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run test:audio-browser (도구 준비 후)

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)
- [Step 08](./08-tasks-progress-logs.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | S07: `completion-store.test.ts`, `task-completion.test.ts`; S08: `audio-return-store.test.ts`, `audio-return.test.ts`; 기존 browser `audio-completion.spec.mjs` 7개 |
| 실행 명령/결과 | Phase 2 경계 `npm run verify`와 audio browser를 포함한 아래 검사가 PASS했다. Standards review 0 findings, Spec review 0 findings. |
| 신규 동작/기존 동작 | 기존 target 68개와 browser 7개의 테스트 이름·행동·기존 assertion을 보존했다. target은 현재 80개이며 query trace와 한국어 GWT 신규 12개만 추가했다. |
| 결함 재현 RED → GREEN | 제품 결함 없음. 제품 코드를 변경하지 않았다. |
| 미검증·제외·후속 | query fake는 API 요청 형태와 모의 상태 전이만 증명한다. 실제 Postgres unique/conditional update/transaction 원자성, migration 적용, RLS는 미검증이다. |

## 계약-증거 대응표

| 공개 API / coordinator 계약 | 기존 증거 | 이번 신규 증거 |
| --- | --- | --- |
| `fetchCompletion`: owner/assignment/task, row/null mapping, DB error | `fetchCompletion selects...`; `fetch and unique-conflict...` | 정확한 projection/`maybeSingle` query trace, Promise rejection |
| `saveCompletionGuarded`: insert/update, expected count, invalid no-write, 23505 reconciliation, missing/old conflict, SQLSTATE vs non-SQLSTATE | `first guarded...`부터 `confirmed DB rejection...`까지 8개 | insert/update의 exact payload·scope·projection/`maybeSingle` query trace, mutation 및 reconciliation Promise rejection; transport rejection은 coordinator의 `uncertain` 연결 |
| `saveAudioLaunch`: payload/onConflict, 새/기존 mapping | `saveAudioLaunch retains...`, `replaces...` | 정확한 projection/`single` query trace, DB error, fake의 null data fallback rejection, Promise rejection |
| `fetchAudioLaunch`: scope, row/null, DB error | `fetchAudioLaunch scopes...`, `returns null...`, `propagates database errors` | 정확한 projection/`maybeSingle` query trace, Promise rejection |
| `saveAudioReturn`: owner/assignment/task/opened/returned-null 조건, returned-at-only, first/0-row/old/duplicate 보호, 오류/rejection | `saveAudioReturn updates...`부터 `propagates rejected requests`까지 8개 | 정확한 projection/`maybeSingle` query trace |
| `task-completion.ts`: 연타, 결과 조회 지연, 동일 시도 재시도, 오래된 응답/scope/dispose, rejected/uncertain | `one click...`부터 `timed out retry...`의 기존 19개 | raw transport Promise rejection이 coordinator `uncertain`으로 전환됨 |
| `audio-return.ts`: 이벤트/연타, 첫 return, stale launch/request, conflict, scope/dispose | `initial focus...`부터 `dispose during conflict fetch...`의 기존 23개 | 미검증 분기 없음; 기존 강한 회귀 유지 |
| client browser 7개 흐름 | `selection-reload`, `saving-status`, `persistent-error`, `return-before-save-response`, `failed-save-retry`, `lost-response-result-check`, `stalled-result-check-recovery` | 독립 fixture, 실제 client bundle + SDK HTTP 대역이라는 Step 04 증거를 재실행 |

`data: null`은 `fetch*`/`saveAudioReturn`의 null 반환과 guarded completion conflict로 기존에 검증된다. `saveAudioLaunch`는 이번 fake가 `{ data: null, error: null }`을 직접 반환해 `unwrap`의 fallback rejection을 확인한다. 이는 앱의 null-data 처리 증거이며 실제 PostgREST가 그 응답 형식을 반환한다는 증거는 아니다. 타입 밖 입력은 공개 TypeScript API로 만들지 않아 N/A다.

| 명령 | 결과 |
| --- | --- |
| `TMPDIR="$PWD/verification-artifacts/tmp" npm run test:unit` | exit 0; 16 discovered files PASS, fail/skip/todo 0 |
| `npm run test:audio-browser` | sandbox는 Chromium EPERM으로 7 FAIL; 승인된 sandbox 밖 재실행 exit 0, 7 PASS |
| `npm run check:contracts` | exit 0; Contract check passed |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; Next production build |
| `TMPDIR="$PWD/verification-artifacts/tmp" npm run verify` | root exit 0; check:contracts/check:sw/check:pwa/test:unit/typecheck/build 모두 PASS, unit 271 pass·fail/cancelled/skipped/todo 0; `verification-artifacts/step15-verify-root-final.log` |
| root `npm run test:audio-browser` | sandbox Chromium EPERM 뒤 승인된 sandbox 밖 재실행 exit 0, 7 passed; `verification-artifacts/step15-audio-browser-root-final.log` |
| `git diff --check` | exit 0 |

제품 결함이나 제품 코드 변경은 없었다. query fake는 실제 Postgres unique/conditional update/transaction 원자성, migration 적용 또는 RLS를 검증하지 않으며, 이 범위는 후속 실제 DB 검증으로 남긴다.
