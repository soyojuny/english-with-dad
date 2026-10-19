# Review

## Status

Step 24 Complete

Step 01–03은 루트의 두 축 검토 0 findings와 필수 PASS 후 main 7dd0f93·1573172·8ee525c로 커밋됐다. Step 04는 최종 검증과 재검토까지 완료했고 Step 05는 unit 3개 TZ 환경 PASS, Step 06은 unit·contracts·typecheck PASS, Step 07은 unit PASS, Step 08은 최종 review와 Phase 1 경계 verify까지 완료했다. Step 01–24는 Complete, Step 25–33은 Pending이다. 전체 자동 계획 또는 런타임 검증이 완료됐다는 의미가 아니다.

## Step 22 Completion — 2026-10-16

제품 코드는 변경하지 않고 `tests/hooks/use-child-task-requests.test.tsx`를 추가·보완했다. 실제 `useChildTaskRequests`와 completion/audio coordinators를 렌더했고, reading-store의 네 API query shape를 구현한 독립 Supabase double과 controlled Promise/fake timer로 H02-N01–N05/E01–E07, H03-N01/E01–E06/F01–F03을 검사했다. 따라서 coordinator 순수 상태 전이를 반복하지 않고 hook action/event/rerender가 complete/check/retry 및 audio return/retry feedback과 data publication을 연결하는지를 관찰한다. 모든 테스트는 Korean name과 Given–When–Then을 사용하며 `as any`와 snapshot을 쓰지 않는다.

정상은 complete/check/retry와 audio return/retry, edge는 pending·checking 각각의 14,999/15,000/15,001ms 경계, blur/focus/visibilitychange, persisted 및 non-persisted pageshow, StrictMode, listener/timer cleanup을 다룬다. owner-only와 assignment-ID-only rerender는 같은 나머지 context에서 분리하고 저장 row의 owner·assignment ID를 확인한다. unmount 및 StrictMode cleanup은 visibilitychange/blur/focus/pageshow 네 event의 설치 callback이 정확히 같은 callback으로 제거되는지도 확인한다. 실패/격리는 dataStatus·scope, 늦은 completion save/fetch, unmount 뒤 audio save, unknown/stale/unmount prepared launch를 확인한다. 실제 DB/RLS, 실기기/PWA 및 browser completion 흐름은 fixture 계층에 포함하지 않고 Step 25에 남긴다.

| 명령 | 결과 | 한계 |
| --- | --- | --- |
| `npm run test:component -- tests/hooks/use-child-task-requests.test.tsx` | PASS, 1 file, 22 passed | jsdom·query double이며 실제 DB/RLS 아님 |
| `npm run test:component` | PASS, 11 files, 91 passed + 기존 expected-fail 4 | 기존 expected-fail 보존 |
| `npm run test:unit` | PASS (`verification-artifacts/step22-unit-root-final.log`) | hook suite와 별도 Node 계층 |
| `npm run typecheck` / `npm run check:contracts` | PASS / PASS | 정적 검증 |
| `npm run build` / `git diff --check` | PASS / PASS (exit 0) | production build·diff whitespace 검사 |
| phase 경계 `npm run verify` | PASS, exit 0 (`verification-artifacts/step22-verify-root-final.log`) | check:contracts·check:sw·check:pwa·test:unit·typecheck·build |

focused component 결과는 `verification-artifacts/step22-focused-root-final.log`, full component 결과는 `verification-artifacts/step22-component-root-final.log`에 기록했다. 최종 Standards review와 Spec review는 각각 0 findings였다. 새 결함이나 새 expected-fail은 없고 제품 수정도 없다. 실제 DB/RLS·실기기/PWA·browser completion은 Step 25 범위로 남긴다.

## Step 21 Completion — 2026-10-16

제품 코드는 변경하지 않고 `tests/hooks/use-child-assignment-selection.test.tsx`를 보완했다. H01-E01/N01/N02/E02–E04/F01–F06은 loading 중 storage 비접근, loading→ready 저장값 복원, 실제 선택 write, 삭제·다른 child·다른 date 저장 ID fallback, 빈 유효 scope, getItem/setItem 예외, null key와 잘못된 요청 ID를 확인한다. H03-N01–N03/E01은 owner-only·child·date의 실제 scope transition과 이전 key write 배제, null key를 거친 복원 state 초기화를 확인한다. 각 사례는 독립 storage/mock과 Given–When–Then을 사용하며 policy 순수 함수의 입력 조합을 반복하지 않고 hook의 effect/action/rerender 연결을 관찰한다.

| 명령 | 결과 | 한계 |
| --- | --- | --- |
| focused hook | 1 file, 14 passed + 2 expected-fail | jsdom hook/storage 대역이며 H01-F05/F06은 확인된 제품 결함을 보존한다. |
| full component | 10 files, 69 passed + 4 expected-fail (`verification-artifacts/step21-component-root-final.log`) | Step 19 `AssignmentEditForm` 2개와 신규 H01-F05/F06 2개를 포함한다. |
| typecheck/contracts/build/diff check | exit 0 | type/contract/production build/diff whitespace를 다시 확인했다. |

최종 Standards 0 findings and Spec 0 findings.

- 확인된 제품 결함: 반환 callback은 assignment ID가 배열에 존재하는지만 확인해 다른 child 또는 date의 assignment도 선택·저장한다. H01-F05/F06은 각각 이를 재현하는 독립 expected-fail이다. 실제 `reading-manager-client.tsx` caller는 childId/date로 이미 filter한 `todayAssignments`만 넘기므로 현재 UI 노출은 제한적이지만 hook 계약은 이를 강제하지 않는다. 제품 수정은 이번 Step 범위 밖이다.
- unmount cleanup은 이 hook에 timer, subscription 또는 비동기 continuation이 없어 N/A다. 그래서 vacuous unmount test를 제거했으며, 실제 browser reload, 다른 탭 storage event, owner/profile 전체 화면 흐름은 Step 25 browser 범위에 남긴다.

## Step 20 Completion — 2026-10-16

제품 코드는 변경하지 않고 component test 3개를 추가했다. `TaskCompletionFeedback`은 idle null, data/loading error role, pending/checking disabled, success/uncertain/error·completion conflict·audio-return conflict/복귀 error, 목표 완료, 네 callback과 단어 읽기 local-time link timestamp를 검사한다. CompletionRequestState conflict는 status 메시지·활성 완료 버튼 및 저장 결과 확인/같은 요청 재시도 버튼 부재를, AudioReturnState conflict는 alert와 수동 완료 유지로 분리했다. `ActivityLogCell`은 빈 cell, OR filter, 자동 그룹 합계·중복 제거, 동일 제목의 category/type 경계, 같은 시리즈의 서로 다른 제목 book summary, direct-input fallback, manual-only delete를 검사한다. `MaterialThumb`은 일반 image와 word-reading role fallback, volume-only/level-only/empty를 포함한 meta 조합을 검사한다.

| 명령 | 결과 | 한계 |
| --- | --- | --- |
| `TZ=UTC TMPDIR=$PWD/verification-artifacts/tmp npm run test:component -- tests/components/task-completion-feedback.test.tsx` | PASS, 1 file; 13 passed | C03-N02는 offset 없는 local-time ISO fixture로 UTC에서 확인했다. |
| `TZ=Asia/Seoul TMPDIR=$PWD/verification-artifacts/tmp npm run test:component -- tests/components/task-completion-feedback.test.tsx` | PASS, 1 file; 13 passed | 같은 fixture와 기대값을 Asia/Seoul에서 확인했다. |
| Step 20 focused component | PASS, 3 files; 27 passed | 이번 단계의 세 신규 test 파일만 실행했다. |
| `TMPDIR=$PWD/verification-artifacts/tmp npm run test:component` | PASS, 9 files; 55 passed, 2 existing expected-fail (`verification-artifacts/step20-component-root-final.log`) | jsdom component 범위다. 기존 Step 19 expected-fail 2개는 AssignmentEditForm quiz visibility 결함이며 이번 변경과 무관하다. |
| `npm run typecheck`; `npm run check:contracts`; `npm run build`; `git diff --check` | 모두 exit 0 | 정적 계약과 production build를 순차 실행했다. |

- 모든 새 test는 Given–When–Then 주석, 독립 fixture/callback, 고유 C03/C04/D08 ID를 사용한다. network/storage/timer를 생성하지 않으며 공통 component setup이 DOM/mock을 정리한다.
- Q05 이미지 load fallback은 제품 계약 미확정이라 구현하거나 test하지 않았다. 실제 parent report browser 흐름은 Step 26, cover load/canvas는 Step 27에 남긴다.
- 새 제품 결함은 발견하지 않았다. idle null은 launch 없는 오디오 과제, 목표 완료는 현재 계약대로 비활성 `완료됨` control로 확인했다.
- 최종 독립 검토는 Standards 0 findings, Spec 0 findings다.

## Planning Status

계획 문서 작성 완료: 8개 phase / 33개 step / 43개 핵심 시나리오 묶음.

사용자는 주요 동작 전체 검증을 선택했고, 실기기는 후속 확인하도록 선택했다. 이후 로컬 DB가 없다고 알려 실제 DB/RLS 검증은 필수 자동 범위에서 제외하는 권장안을 반영했다. 현재 환경 기준으로 진행하며 별도로 로컬 구축을 요청하면 후속 계획을 작성한다.

## Plan Conformance

- Step 01은 계획 문서만, Step 02는 단위 러너·컴파일 경계·공통 fixture, Step 03은 환경별 설정·호환성 테스트를 변경했다. Step 04는 browser 프로젝트·HTTP fixture·실행/실패/정리 검증과 관련 문서를 추가한다.
- 제품 app/lib/Supabase migration은 변경하지 않았다. Step 03–04의 dev 도구 exact pin 설치와 lock 변경은 루트가 수행했다.
- 사용자의 전체 순차 구현·step별 커밋 요청을 반영했다. Step 04 개발 pane은 이 step만 수행했고 검토·커밋·다음 step 전달은 루트가 맡았다. push·배포 권한은 없다. 사용자 제공 초기 계획 문서 38개는 첫 step 커밋 범위다.
- 기존 node:test와 오디오 브라우저 회귀를 유지하며 신규 계층을 분리하는 계획이다.
- DB query 조건 검사와 실제 DB/RLS, browser simulation과 실기기를 구분한다.
- 용어와 도메인 규칙을 바꾸지 않아 docs/CONTEXT.md·ADR 추가는 필요하지 않다.

## Findings

- 기존 테스트는 순수 계산·선택 policy·완료/복귀 coordinator 및 관련 store 동작을 이미 보호한다.
- 자료/배정/부모 기록의 store 공개 API, 컴포넌트·hook 수명주기, 인증, QR/image, SW 실행, 하네스 실패 경로는 추가 검증이 필요하다.
- 기존 audio browser는 esbuild 클라이언트 bundle + HTTP fixture다. Next 서버와 SSR 인증 경계는 별도 검증해야 한다.
- node 단위 컴파일/발견 범위에 신규 계층이 잘못 섞이지 않도록 설계해야 한다.
- .test-build를 발견하는 실행기는 stale 산출물 처리도 검증 대상으로 삼는다.
- 로컬 DB가 없으므로 actual migration·RLS·RPC·제약·DB 경쟁 보장은 확인할 수 없다.
- 실기기 확인은 자동 계획의 완료 조건에 넣지 않기로 했다.
- Step 02에서 단위 러너/fixture와 전체 lib 목록의 V8 함수 실행 baseline을 확인했다. 원본 line/branch·다른 계층의 coverage는 미측정이며 임의 전역 수치 gate는 없다.

## Step 09 Completion — 2026-10-14

- 최초 findings: 전체 null/empty와 프로필 정상 매핑이 한 테스트에 결합됐고, owner nullable·invalid quiz와 프로필 null/빈 경계, table별 projection 검증이 부족했다.
- 해소: 독립 Given–When–Then 테스트로 분리하고 `quiz_score`/`returned_at` null, `quiz_score: "UNKNOWN"`의 null 정규화, 정확한 snake_case select projection을 보강했다.
- 최종: root `npm run test:unit` exit 0, 10개 발견 파일 PASS, fail/skip/todo 0 (`verification-artifacts/step09-unit-root-final.log`); `npm run check:contracts`·`npm run typecheck` exit 0, pane `npm run build` exit 0, `git diff --check` exit 0. 최종 Standards 0 findings, 최종 Spec 0 findings.
- 제한: query 대역은 실제 DB, migration 적용 또는 RLS를 실행하지 않았으며 이를 검증 증거로 주장하지 않는다.

## Step 10 Completion — 2026-10-14

- 최초 findings: upcoming 시작일 조건의 `gte` 연산자, embedded 관계 FK 이름을 포함한 select fixture, 여러 결과를 한 테스트에 결합한 구조, 빈 row/data null의 성공 계약, completion·audio의 assignment-task 복합 key 검증이 부족했다.
- 해소: 제한 query 대역이 exact `eq`/`gte` 필터·FK 관계 select·날짜 정렬을 강제하도록 하고, object/array/null·빈 row/data null·오류 전파와 복합 key를 독립 Given–When–Then 테스트로 분리했다.
- 최종: root `npm run test:unit` exit 0, 11개 발견 파일 PASS, fail/skip/todo 0 (`verification-artifacts/step10-unit-root-final.log`); `npm run check:contracts`·`npm run typecheck` exit 0, pane `npm run build` exit 0, `git diff --check` exit 0. 최종 Standards 0 findings, 최종 Spec 0 findings.
- 제한: query 대역은 실제 DB, embedded 관계 SQL/FK 또는 RLS를 실행하지 않았으며 이를 검증 증거로 주장하지 않는다.

## Step 11 Completion — 2026-10-14

- 최초 findings: 중복 PK assignment fixture, Promise.all query 순서 결합, 초기/후속 `data null`과 row 기본값 공백, copywork audio launch의 도메인 불일치, S03의 child 필터 암시가 있었다.
- 해소: assignment ID를 고유하게 하고 공유 book ID만 dedup으로 검증했으며, table-keyed 대역으로 순서 결합을 제거했다. `data null`·세 기본값 GWT와 wordReading `wordRead` audio launch를 추가하고 S03을 owner 범위로 정정했다.
- assignment ID dedup은 PK상 정상 DB 응답 N/A인 방어 로직이므로 정상 계약으로 주장하지 않는다. 초기 children/assignments/manual_logs와 후속 books/completions/audio_launches의 각 DB error, 초기 assignments·후속 books의 대표 Promise rejection도 빈 활동표로 숨기지 않고 전파되는지 검증한다.
- 최종: root `npm run test:unit` exit 0, 12개 발견 파일 PASS, fail/skip/todo 0 (`verification-artifacts/step11-unit-root-final.log`); `npm run check:contracts`·`npm run typecheck` exit 0, pane `npm run build` exit 0, `git diff --check` exit 0. 최종 Standards 0 findings, 최종 Spec 0 findings.
- 제한: query 대역은 실제 DB/migration/FK/RLS를 실행하지 않았으며 이를 검증 증거로 주장하지 않는다.

## Verification Run

계획 작성 당시 실행:

| 명령 | 결과 | 의미 |
| --- | --- | --- |
| npm run plan:workflow -- "<전체 코드 테스트 계획 요청>" | exit 0, harness 분류, 범위 경고 없음 | 계획 보조 확인 |
| npm run test:unit | exit 0, 발견된 6개 테스트 파일 통과 | 기존 단위 baseline; 출력은 파일 단위이므로 개별 assertion 총개수로 해석하지 않음 |
| npm run check:contracts | exit 0 | 기존 프로젝트 계약 확인 |

계획 작성 후 링크·step 의존성·파일 대응 및 contracts 검증 결과는 아래 Planning Document Check에 추가한다. npm run verify 전체, 브라우저 및 실제 DB는 이번 문서 작업에서 실행하지 않았다.

## Planning Document Check

- 문서 38개, phase 8개, step 33개와 연속 번호를 확인했다.
- task 필수 항목·초기 Pending 상태, 문서 상대 링크, 선행 step의 존재와 순환 여부를 검사했다.
- app/·lib/·scripts/의 운영 소스 목록을 inventory.md와 대조했다. 첫 대조에서 reading-store의 전체 파일 경로 표기를 보완했다.
- 작성 후 npm run check:contracts 통과, plan:workflow는 문서 외 코드 변경 경고 없음.
- 보완 후 문서 구조 재검사 통과: 상대 링크, 33개 연속 step, 선행 관계, 필수 항목과 운영 소스 대응 모두 확인했다.

## Step History

계획 작성 시 모든 step은 Pending이었다. 현재 Step 01–04 구현이 Complete이며 진행 결과와 검토·커밋 상태는 각 task Execution Record와 이 표에 함께 기록한다.

| Phase | Step | Status | 실행한 검사/결과 |
| --- | --- | --- | --- |
| 0 | 01 검증 계약과 전체 코드 목록 확정 | Complete | check:contracts exit 0; 문서/파일/API/증거 대조 exit 0. 루트 Standards/Spec 0 findings, main 7dd0f93 커밋. |
| 0 | 02 단위 테스트 실행기와 공통 fixture | Complete | test:unit/typecheck PASS; root harness 8 PASS·direct unit 110 PASS; source baseline 기록. 루트 Standards/Spec 각 0 findings, main 1573172 커밋. |
| 0 | 03 컴포넌트·hook·서버 테스트 기반 | Complete | component 6/server 2/unit 110/probe 2 PASS, typecheck PASS. 기본 TMPDIR probe도 2 PASS. ENOSPC·임시 probe TS5097과 해결은 아래 기록. 루트 Standards/Spec 각 0 findings, main 8ee525c 커밋. |
| 0 | 04 브라우저 fixture와 실제 Next 실행 구분 | Complete | verify exit 0; component 6/server 2/harness 13/browser 9 PASS; 최종 typecheck exit 0. 재검토 중 Spec의 JSON artifact 1건을 보완·재검증했으며, 최종 Standards 0 findings/Spec 0 findings. |
| 1 | 05 날짜와 주·월 경계 | Complete | unit 기본·Asia/Seoul·UTC 모두 exit 0, 각 8 파일 PASS; malformed 날짜는 Q01로 유지. |
| 1 | 06 초기 데이터와 입력 초안 복사 | Pending | 미실행 |
| 1 | 07 자료 준비 상태와 배정 후보 | Complete | root 최종 `test:unit` exit 0; 127 PASS/fail·skip·todo 0. Standards/Spec 최종 0 findings; Step 02 runner 증거 재사용. |
| 1 | 08 횟수·진행률·활동 기록 | Complete | root 최종 `test:unit` 9개 발견 파일 PASS(fail/skip/todo 0), `check:contracts`/`git diff --check` PASS, Standards/Spec 각 0 findings. Phase 1 `verify` PASS; 제품 코드 변경 없음. |
| 2 | 09 전체·프로필 조회와 row 매핑 | Complete | `tests/reading-store-read.test.ts`로 projection·owner·정렬, null/빈/nullable·유효하지 않은 quiz 문자열 정규화, 각 DB error와 Promise rejection을 query 대역으로 검증. root final `test:unit` exit 0, 10 files PASS/fail·skip·todo 0 (`verification-artifacts/step09-unit-root-final.log`); contracts/typecheck/build/diff check exit 0; 최종 Standards/Spec 0 findings. 실제 DB/migration 적용/RLS 미검증. |
| 2 | 10 오늘·예정 배정의 embedded 데이터 조회 | Complete | `tests/reading-store-child.test.ts`가 select와 `{operator, column, value}`의 today eq/upcoming gte owner·child·date 범위 및 정렬을 강제한다. object/array/null·빈 응답·복합 key와 예정 범위/정렬/scope/dedup, DB error·Promise rejection은 독립 GWT다. root final `test:unit` exit 0, 11개 발견 파일 PASS/fail·skip·todo 0 (`verification-artifacts/step10-unit-root-final.log`); contracts/typecheck/build/diff check exit 0; 최종 Standards/Spec 0 findings. 실제 DB/FK/RLS 미검증. |
| 2 | 11 부모 활동 범위 조회 | Complete | `tests/reading-store-parent.test.ts`가 order-independent table-keyed exact table/select/operator/order/in 대역으로 기간·owner·공유 book ID dedup·빈 후속 조회 생략·수동 기록·초기/후속 data null·3개 기본값과 1차/후속 DB error·대표 Promise rejection을 검증. assignment ID dedup은 PK상 정상 DB 응답 N/A인 방어 로직. root final `test:unit` 12 files PASS (`verification-artifacts/step11-unit-root-final.log`), contracts/typecheck/pane build/diff check exit 0, Standards/Spec 0 findings; 실제 DB/migration/FK/RLS 미검증. |
| 2 | 12 자료 관리·시리즈·배정 이력 조회 | Complete | root final `test:unit` exit 0, 13 files PASS/fail·skip·todo 0 (`verification-artifacts/step12-unit-root-final.log`); contracts/typecheck/pane build/diff check exit 0, Standards/Spec 0 findings. 실제 DB/RPC SQL/migration/RLS 미검증. |
| 2 | 13 아동·자료 저장과 활성 상태 | Complete | `tests/reading-store-material-write.test.ts`가 insert/update payload, exact table/select/single, owner/id filter, 일반/단어 읽기 빈 선택 문자열·null content_type row 매핑, 비활성 edit 보존, 활성 변경과 error/data null/rejection을 제한 mutation 대역으로 검증. `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run test:unit` exit 0, 14 discovered files, fail/skip/todo 0; contracts/typecheck/이전 개발 pane build/diff check exit 0; Standards/Spec 0 findings. 실제 DB/migration/RLS 미검증. |
| 2 | 14 배정·퀴즈·수동 기록 저장 | Complete | `tests/reading-store-assignment-write.test.ts` 14개와 `tests/reading-store-manual-log.test.ts` 7개, 합계 21개가 bulk upsert conflict key/payload/매핑, quiz PASS/FAIL·Y→N null, task count, owner/id delete, manual log 경계와 대표 실패를 strict mutation fake로 검증. root final unit 16 files PASS, contracts/typecheck/pane build/diff check exit 0, Standards/Spec 0 findings. 제품 결함·제품 코드 변경 없음; 실제 unique/cascade/transaction/migration/RLS 및 삭제 0행 Q03은 미검증. |
| 2 | 15 완료·실행 저장 기존 회귀 보강 | Complete | root final verify exit 0, unit 271/271 PASS, audio browser 7/7 PASS; Standards/Spec 각 0 findings. 실제 DB/RLS 미검증. |
| 3 | 16 인증 설정과 Supabase client 경계 | Complete | root `npm run test:server` exit 0, 3 files/23 tests PASS(신규 config 14개·clients 7개, 기존 callback 2개; `verification-artifacts/step16-server-root-final.log`); root typecheck/contracts, 개발 pane build, diff check exit 0; Standards/Spec 0 findings. 제품 결함·제품 코드 변경 없음. 실제 Supabase Auth/session refresh/cookie serialization/OAuth/RLS 미검증. |
| 3 | 17 인증 callback·middleware·서버 페이지 | Complete | root server 4 files/32 PASS + 1 expected-fail (`verification-artifacts/step17-server-root-final.log`), root Next browser 4 PASS (`verification-artifacts/step17-browser-next-root-final.log`); root typecheck/contracts/build/diff check exit 0; 최종 Standards/Spec 0 findings. 제품 코드 변경 없음. protocol-relative `next` validation 결함 1건은 same-origin redirect이며 외부 open redirect 아님; Q04 query/hash와 실제 OAuth/JWT/session persistence/DB/RLS 미검증. |
| 3 | 18 로그인·로그아웃 UI | Complete | root component 4 files/17 tests PASS (`verification-artifacts/step18-component-root-final.log`); root 개별 typecheck/contracts/build/diff check exit 0; Standards 0 findings, Spec 0 findings. Phase 3 경계 root `npm run verify` exit 0 (`verification-artifacts/step18-verify-root-final.log`; contracts/SW/PWA/unit/typecheck/build만 포함; component/server/browser는 포함하지 않음). 실제 Google/OAuth redirect/session persistence/DB/RLS 미검증. |
| 4 | 19 배정 picker와 편집·퀴즈 컴포넌트 | Complete | root component 6 files/28 PASS + 2 expected-fail, exit 0 (`verification-artifacts/step19-component-root-final.log`); root contracts/build/diff check exit 0, build 후 단독 root typecheck exit 0. 최초 build와 병렬 typecheck의 TS6053은 `.next/types` 생성물 교체 경합으로 단독 재실행에서 해소됐다. Standards 0 findings, Spec 0 findings. 제품 코드는 변경하지 않았으며 C01-N01/N02/N03/N04/E01/E02/E03, D06-N02/N03/E02/E03/E04, C02-N01/N02와 Step 03 T01-E07을 보존했다. 빈 extraStudy fallback quiz visibility 결함은 regular/wordReading 두 expected-fail로 재현하며, invalid 강제 입력/최종 제출 검증은 Step 24, browser 학습 흐름은 Step 25에 남긴다. |
| 4 | 20 완료 안내·활동 셀·자료 표시 | Complete | focused Step 20 3 files/27 PASS, C03 UTC·Asia/Seoul 각각 1 file/13 PASS; root component 9 files/55 PASS + 기존 2 expected-fail (`verification-artifacts/step20-component-root-final.log`), typecheck/contracts/build/diff check 모두 exit 0. Standards/Spec 0 findings. 제품 코드는 변경하지 않았고 새 제품 결함은 없으며, Q05 이미지 load fallback과 실제 parent report browser 흐름은 Step 27·26에 남긴다. |
| 4 | 21 배정 선택 복원 hook | Complete | focused hook 1 file, 14 passed + 2 expected-fail; full component 10 files, 69 passed + 4 expected-fail (`verification-artifacts/step21-component-root-final.log`); typecheck/contracts/build/diff check exit 0; final Standards 0 findings and Spec 0 findings. 제품 코드는 변경하지 않았다. H01-F05/F06은 배열에 있는 assignment를 childId/date와 달라도 callback이 수용하는 확인된 expected-fail 결함이며, 실제 `reading-manager-client.tsx` caller는 filtered `todayAssignments`를 전달해 노출이 제한된다. unmount cleanup N/A; browser reload/다른 탭 storage event/전체 profile switching은 Step 25 후속. |
| 4 | 22 완료·복귀 hook 수명주기 | Complete | focused hook 1 file/22 PASS (`verification-artifacts/step22-focused-root-final.log`); full component 11 files/91 PASS + 4 expected-fail (`verification-artifacts/step22-component-root-final.log`); unit PASS (`verification-artifacts/step22-unit-root-final.log`); phase 경계 `npm run verify` PASS, exit 0 (`verification-artifacts/step22-verify-root-final.log`). 최종 Standards/Spec review는 각각 0 findings이며 실제 DB/RLS·실기기/PWA·browser completion은 Step 25 후속이다. |
| 5 | 23 프로필·자료 등록과 관리 흐름 | Complete | focused profile/material 15 PASS (`verification-artifacts/step23-focused-root-final.log`); full client HTTP 22 PASS (`verification-artifacts/step23-client-root-final.log`); audio-only wrapper 7 PASS (`verification-artifacts/step23-audio-root-final.log`); typecheck/contracts/build PASS (`verification-artifacts/step23-typecheck-root-final.log`, `verification-artifacts/step23-contracts-root-final.log`, `verification-artifacts/step23-build-root-final.log`); `git diff --check` PASS. 최종 Standards/Spec review 각각 0 findings, 신규 제품 결함·expected-fail 없음. `npm run verify`는 Phase 5 종료가 아니므로 미실행. |
| 5 | 24 배정 생성·갱신·편집·삭제 흐름 | Complete | focused browser 16 PASS (`verification-artifacts/step24-focused-root-final.log`); full client 38 PASS (`verification-artifacts/step24-client-root-final.log`); audio wrapper 7 PASS (`verification-artifacts/step24-audio-root-final.log`). focused `./node_modules/.bin/tsc -p tsconfig.test.json && node .test-build/tests/reading-data.test.js` 5 cases PASS (`verification-artifacts/step24-cache-unit-root-final.log`); full `npm run test:unit` 17 files PASS (`verification-artifacts/step24-unit-root-final.log`). contracts/typecheck/build PASS (`verification-artifacts/step24-contracts-root-final.log`, `verification-artifacts/step24-typecheck-root-final.log`, `verification-artifacts/step24-build-root-final.log`); `git diff --check` PASS. Standards/Spec review 각각 0 findings. 제품 동작은 변경하지 않았고 삭제 상태 전이는 순수 lib helper로 추출해 기존 UI 흐름에 연결했다. 실제 DB upsert conflict/cascade/RLS는 미검증이며 U03-F02는 documented contract-level unreachable guard다. 새 제품 결함·expected-fail 없음; Phase 5는 Step 26에 끝나므로 `npm run verify`는 실행하지 않았다. |
| 5 | 25 아동 학습과 완료·퀴즈 흐름 | Pending | 미실행 |
| 5 | 26 부모 활동표·수동 기록·출력 | Pending | 미실행 |
| 6 | 27 표지 압축과 QR 이미지 판독 | Pending | 미실행 |
| 6 | 28 카메라·QR 입력 수명주기 | Pending | 미실행 |
| 6 | 29 서비스워커 캐시의 실행 동작 | Pending | 미실행 |
| 6 | 30 모바일 레이아웃과 접근 가능한 조작 | Pending | 미실행 |
| 7 | 31 개발 하네스 스크립트 회귀 | Pending | 미실행 |
| 7 | 32 통합 검사와 커버리지 공백 점검 | Pending | 미실행 |
| 7 | 33 계획 대비 리뷰와 후속 인계 | Pending | 미실행 |

## Step 01 Execution — 2026-10-13

기준 main HEAD는 사용자 제공 `47274cca14833395724a7bb8cf7e93a3a1150c52`다. 수정 파일은 plan.md, inventory.md, scenarios.md, tasks/01-scope-matrix.md, review.md의 5개 문서이며 초기 계획 전체 38개 문서는 사용자 입력으로 첫 step 커밋에 포함된다. 제품·패키지·테스트·migration 코드는 변경하지 않았다.

| 명령 / 대조 | 결과 | 증거와 한계 |
| --- | --- | --- |
| npm run check:contracts | PASS, exit 0; Contract check passed | /tmp/ewd-step01-contracts.log; 프로젝트 정적 계약만 |
| python3 /tmp/ewd-step01-document-check.py | PASS, exit 0 | /tmp/ewd-step01-document-check.json; UTF-8·표 구조·상대 링크·38개 문서/33개 task·의존성·step 상태·43개 시나리오·운영 파일/API·기존 증거 대조 |
| rg --files app lib public scripts supabase/migrations tests 및 export/test/run 선언 조회 | 대조 완료 | app 15/lib 15/scripts 7/public 9/migration 13개, middleware/설정; runtime export 102개/type export 30개; unit 6파일/93선언·audio 7선언 |
| npm run test:unit / typecheck / build / verify / test:audio-browser | 이번 step 미실행 | 문서만 변경; 과거 계획 baseline과 이번 실행을 구분. 신규 하네스 없음 |

- 문서 수정: fetchAssignedBookIds는 owner 전체 이력으로 child 인자가 없다. manage 조회는 비활성 자료도 포함하고 library 조회만 active 조건이다. 오늘 embedded books와 미래 books dedup을 구분했다. saveBook 선택 문자열을 null로 변환하는 계약을 만들지 않았다.
- scenarios.md는 각 ID에 source/담당 step/계층/제안 테스트 경로/기존 증거와 정상·edge·invalid 또는 N/A 이유를 연결한다. 개별 실행 기록 양식도 고정했다. 신규 경로는 실제 테스트 존재/발견 결과로 계산하지 않는다.
- discovery·실패 exit·runtime cleanup은 이번 step N/A다. 실행기/테스트/fixture를 추가하거나 변경하지 않았고 DOM/storage/env/timer/listener 등 런타임 자원을 생성하지 않았기 때문이다. 이 증명은 Step 02–04·31에 남아 있다. 문서 대조 도구는 /tmp에서 독립 실행하며 저장소 러너로 추가하지 않았다.
- 제품 결함으로 확인/재현한 항목은 없다. Q01~Q05(날짜 형식·검색 wildcard·삭제 0행·Auth 상세 오류/next 구성·표지 load fallback)는 미확정 경계다. 후속 담당 step에서 근거를 확인하고 실패 계약이 확인되면 루트에 먼저 보고한다. 임의 제품 수정이나 RED/GREEN 성공 기록은 없다.
- DB/RLS·실제 Auth/OAuth·Android/실물 출력은 follow-up.md의 후속 제외를 유지한다. query/HTTP 대역을 실제 격리·실기기 성공으로 해석하지 않는다.
- 사용자 추가 지침에 따라 code-review의 두 축 검토와 commit은 루트에 넘긴다. implement skill의 commit/review 일반 지침보다 이번 역할 분담이 우선한다. fixed point 질문, subagent/Herdr, commit/push/배포, 승인/네트워크가 필요한 실행은 수행하지 않았다.

### Step 01 루트 검토

- Standards: 발견 사항 0개. Spec: 발견 사항 0개.
- 루트가 check:contracts 및 문서 대조를 재실행해 PASS를 확인했다.
- 완료 기준 검토 후 초기 사용자 제공 계획 문서 38개를 main `7dd0f93`으로 커밋했다.

## Step 02 Execution — 2026-10-13

기준 main: `7dd0f93`. 단위 러너가 정리→컴파일→발견→실행을 맡고 noEmitOnError 및 unit/harness 경계를 분리했다. 공통 deferred·로컬 fixedClock·독립 readingFixture와 회귀를 추가했다. 기존 6파일의 본문은 유지하고 3파일의 helper import만 변경했다. 제품/의존성/lock 변경은 없다.

| 명령·실행 경계 | 결과 | artifact / 의미 |
| --- | --- | --- |
| npm run test:unit; 각 emitted 파일 직접 node 실행 | PASS exit 0; 명령 출력은 7파일, direct는 총 110 test/110 PASS/0 FAIL/skip/todo | /tmp/ewd-step02-unit.log; /tmp/ewd-step02-unit-direct.log. 기존 6파일 106개 + 신규 fixture 4개이며 assertion 총개수는 아님 |
| npm run typecheck | PASS exit 0 | /tmp/ewd-step02-typecheck.log |
| 개발 pane npm run test:harness / direct | FAIL: sandbox spawnSync EPERM | /tmp/ewd-step02-harness.log; /tmp/ewd-step02-harness-direct.log. 권한 경계이며 PASS로 계산하지 않음 |
| root npm run test:harness, 최초 sandbox 밖 | FAIL: 3 PASS/5 FAIL | /tmp/ewd-step02-root-harness-escalated.log. NODE_TEST_CONTEXT 상속으로 CLI가 재귀 run 경고 후 실행을 생략하고 status 0 |
| root npm run test:harness / direct, env 분리 후 | 둘 다 PASS exit 0, 8 test/8 PASS/0 FAIL/skip/todo | /tmp/ewd-step02-root-harness-final.log; /tmp/ewd-step02-root-harness-direct-escalated.log. 신규/중첩 발견·삭제 stale·0개·실제 assertion 실패·컴파일 오류·다른 계층 제외 증명 |

- NODE_TEST_CONTEXT는 subprocess env 복사본에서만 제거한다. 부모 env 변경/skip 처리 없이 실제 실패 출력과 nonzero를 확인했다. 이는 승인 범위의 하네스 수정이며 제품 결함 수정은 아니다.
- 임시 프로젝트/복사본/symlink는 test마다 t.after로 제거한다. Promise/시계/도메인/query state는 인스턴스별 독립이며 global Date/timer/env 교체와 범용 query 대역은 없다. node_modules는 읽기 참조하고 DB/네트워크는 실행하지 않는다.
- source baseline은 아래에 기록했다. DOM/storage/listener·다른 하네스 도구는 후속 step에 남기고 DB/RLS·실기기·OAuth 제외를 유지한다. phase 0 전체 완료 전이므로 verify/build/browser 추가 실행은 없다.
- 루트 Standards/Spec 각 0 findings 후 main `1573172` 커밋 완료. 당시 개발 pane은 commit/push/Step 03/agent/Herdr를 수행하지 않았다.

## Step 02 Coverage Baseline — 2026-10-13

환경: Node v22.23.2, TypeScript 5.9.3. `NODE_V8_COVERAGE=/tmp/ewd-step02-v8-coverage npm run test:unit`은 exit 0이다. `/tmp/ewd-step02-coverage-baseline.py`로 worker JSON의 동일 이름/start/end 함수 범위를 합쳐 최대 hit count를 취하고, `.test-build/lib/*.js`를 대응하는 `lib/*.ts`로 연결했다. 결과는 `/tmp/ewd-step02-coverage-baseline.json`이다.

전체 제품 source 범위는 app/**/*.ts(x), lib/**/*.ts, middleware.ts, public/sw.js다. scripts/*.mjs는 하네스 범위로 별도 추적한다. 이번 unit baseline은 **lib 런타임 14개 모두**를 분모 목록에 남기며 7개를 로드했다. 미import 7개도 실행 함수 0으로 표시한다. app 15개, middleware.ts, public/sw.js와 나머지 하네스 스크립트는 후속 계층에서 측정할 공백이며 완료/제외 처리하지 않는다.

| source | unit import | 실행한 named V8 함수 / 발견한 named V8 함수 | 후속 담당 step |
| --- | --- | --- | --- |
| lib/audio-return.ts | 로드 | 13 / 13 | 15 |
| lib/child-task-policy.ts | 로드 | 5 / 5 | 08 |
| lib/cover-image.ts | 미import (실행 0) | 0 / 미측정 | 27 |
| lib/qr-reader.ts | 미import (실행 0) | 0 / 미측정 | 27 |
| lib/reading-calculations.ts | 로드 | 24 / 24 | 05·07·08 |
| lib/reading-data.ts | 로드 | 2 / 2 | 05·06·08 |
| lib/reading-drafts.ts | 미import (실행 0) | 0 / 미측정 | 06 |
| lib/reading-period.ts | 로드 | 4 / 5 | 05 |
| lib/supabase/client.ts | 미import (실행 0) | 0 / 미측정 | 16 |
| lib/supabase/config.ts | 미import (실행 0) | 0 / 미측정 | 16 |
| lib/supabase/middleware.ts | 미import (실행 0) | 0 / 미측정 | 17 |
| lib/supabase/reading-store.ts | 로드 | 7 / 35 | 09–15 |
| lib/supabase/server.ts | 미import (실행 0) | 0 / 미측정 | 16 |
| lib/task-completion.ts | 로드 | 17 / 17 | 15 |

이 수치는 named 함수의 실행 공백을 찾는 초기 증거이며 TypeScript 원본 line/branch 커버리지 퍼센트가 아니다. 익명 callback, 분기 hit와 source-map 집계는 아직 정량화하지 않았고, 미import 파일의 함수 총수도 엔진이 발견하지 않아 `미측정`으로 남긴다. importer만의 높은 수치로 전체 통과를 주장하지 않는다. 전역 퍼센트 gate는 없다. Step 32에서 원본 source mapping·미import 포함 계층별 보고와 기존 대비 후퇴 방식을 확정한다.

제외: 타입 전용 lib/reading-types.ts(타입 계약은 typecheck), tests/fixture, 자산·설정·문서, ignored legacy 및 생성 산출물. 서버/브라우저/SW 코드는 미검증 공백이며 coverage 제외가 아니다. 쿼리 대역의 함수 실행은 실제 DB/RLS 보장이 아니다.

## Step 03 Execution — 2026-10-13

기준 main `1573172`. Vitest 5.0.4/Vite 7.3.7/RTL 16.3.3/DOM 10.4.2/user-event 14.6.7/jsdom 30.1.2를 루트가 exact pin 설치했다. jsdom component/hook·Node server 설정, 경계 mock 및 실패 probe를 추가하고 기존 node:test·제품 소스를 유지했다. JSX automatic transform으로 추가 React plugin은 필요하지 않았다.

| 명령·경계 | 최종 결과 / 증거 |
| --- | --- |
| 개발 pane npm run test:component | exit 0, 3파일·6 test PASS(실제 실행 출력) |
| root npm run test:server / npm run test:unit | exit 0, 각 2/110 test PASS; verification-artifacts/step03-server.log·step03-unit.log |
| root node --test tests/harness/component-server-runner.test.mjs | exit 0, 2 test PASS·fail/skip/todo 0; step03-probe.log. 자식 CLI의 실제 1 failed·원인·nonzero를 각각 확인 |
| root 동일 probe, TMPDIR 미지정 | exit 0, 2 test PASS·fail/skip/todo 0; verification-artifacts/step03-default-tmp-probe.log. 기본 /tmp의 의존성 resolve 문제 없음 |
| 개발 pane npm run typecheck, 수정 후 | exit 0; verification-artifacts/step03-typecheck-final.log |

기본 검사의 TMPDIR는 `$PWD/verification-artifacts/tmp`이며 위 기본 TMPDIR probe만 미지정으로 실행했다. 최초 server/typecheck는 실행 전 sandbox mount ENOSPC(exit 101), root 최초 typecheck는 병렬 probe를 제품 `**/*.ts`가 발견해 TS5097(step03-typecheck.log)이었다. root의 공간 확보 후 실행됐고, tsconfig.json.exclude에 생성 verification-artifacts만 추가해 마지막 typecheck가 통과했다. 허용된 하네스 경계 수정이며 제품 기능 수정이 아니다. 개발 pane은 성공한 검사를 반복하지 않았다.

afterEach는 DOM/storage/timer/spy/global/env를 복원하고 StrictMode effect의 listener/interval 해제를 확인했다. 임시 probe는 t.after로 제거한다. 전체 A01/A02/A04/C02/H02 검증·source coverage 재측정·실제 DB/RLS/OAuth/async Page/실기기는 후속이며, phase 전체 verify는 Step 04 이후다. 루트 Standards/Spec 각 0 findings 및 최종 typecheck 로그 확인 후 main `8ee525c` 커밋 완료; 당시 개발 pane은 Step 04를 시작하지 않았다.

앱 직접 Next/React/Supabase 버전은 유지됐다. lock의 공유 nanoid 3.3.12→3.3.20, source-map-js 1.2.1→1.2.2 patch dedupe는 설치 범위다. audit 3건은 기존 next/postcss/sharp 동일 버전이며 신규 테스트 도구에는 없다는 루트 확인을 기록한다(verification-artifacts/step03-audit.json). 이번 범위에서 보안 업그레이드는 하지 않았고 별도 앱 의존성 후속으로 남긴다.

## Step 04 Execution — 2026-10-13

기준 main `8ee525c`. root가 @playwright/test 1.64.0/esbuild 0.28.2 exact pin과 Chromium 156.0.8078.4 설치·launch/close sanity를 확인했다. package 편집은 설치 종료 후 시작했다. 기존 audio 명령은 client-http 프로젝트 CLI wrapper이며 7개 회귀의 이름/행동/assertion을 보존했다. next-auth-http는 실제 Next 복사본/로컬 Auth HTTP/합성 session cookie를 사용한다. 앱·framework·next.config 변경은 없다.

| 명령·경계 | 결과 / 증거 |
| --- | --- |
| root 최초 test:browser:next | 2 FAIL; verification-artifacts/step04-next-feasibility.log. framework registry 요청 차단 및 프로필 선택 전 로그아웃 기대가 원인; 실패 trace/화면/요청·Next 로그·cleanup 보존 |
| root 수정 후 test:browser:next | exit 0, 2 PASS(27.6s); step04-next-feasibility-final.log. 실제 SSR HTML 및 middleware/Page Auth HTTP를 확인 |
| root test:audio-browser | exit 0, 기존 7 PASS(28.9s); step04-audio.log |
| root npm run verify / test:component / test:server | 모두 exit 0, component 6/server 2 PASS; verification-artifacts/phase00-{verify,component,server}.log |
| root 최초 npm run test:harness | 12 PASS/1 FAIL; phase00-harness.log. T01-F06 자식 CLI nonzero·trace·화면은 존재했으나 :88의 독립 요청 JSON 파일 검사 FAIL |
| root 2차 test:harness | 12 PASS/1 FAIL; phase00-harness-final.log. screenshot/trace는 생성됐으나 :88의 독립 요청 JSON 파일 검사 FAIL |
| root JSON 저장 보완 후 T01-F06 단독 | exit 0, 1 PASS; step04-artifact-final.log. 독립 requests.json 파일을 확인 |
| root 최종 npm run test:harness | exit 0, 13 PASS; phase00-harness-final-2.log |
| root TZ=America/Los_Angeles npm run test:browser | exit 0, 9 PASS(34.1s); phase00-browser.log. client 7/Next 2의 두 번째 독립 실행 및 날짜/제어 시계 수정 확인 |
| root 최종 npm run typecheck | exit 0; step04-typecheck-final.log |

모든 browser profile/build/fixture TMPDIR와 browser cache는 ignored verification-artifacts 아래다. 각 context·HTTP server·Next process group·임시 복사본/bundle을 finally에서 정리하며 실패 artifact는 보존한다. page.route는 client SDK HTTP만 대체하고 SSR은 실제 로컬 Auth HTTP를 사용한다. 알려진 Next dev npm 버전 확인 한 건은 외부 전송 없이 503으로 답하며 다른 예상 밖 요청은 실패시킨다. 실제 Auth/JWT/OAuth·DB/RLS·실기기 보장과 상세 기능/coverage 검증은 후속이다. code-review·commit은 root 담당이며 Step 05는 시작하지 않았다.

최초 Standards 2건은 수정했다. fixture 날짜는 Node 로컬 TZ 계산 대신 고정 한국 날짜를 사용한다. UI 준비는 locator/명시 fixture 상태로 기다리고, 토스트 이후 3초·요청 timeout 15초는 설치·정지한 Playwright clock으로 진행한다. 기존 7개 행동/assertion은 유지한다. 재검토 중 Spec은 T01-F06의 독립 requests.json artifact 누락 1건을 발견했고, teardown 실패 screenshot을 context 종료 전 저장하며 요청 JSON을 별도 파일로 저장·attach하도록 보완했다. T01-F06 단독 1 PASS, 최종 harness 13 PASS, TZ browser 9 PASS와 최종 typecheck exit 0으로 해소한 뒤 최종 Standards 0 findings, Spec 0 findings를 확인했다.

## Step 05 Execution — 2026-10-14

기준 HEAD는 사용자 제공 `12b4514`이다. 제품 코드는 변경하지 않고 `tests/reading-period.test.ts`를 추가하고 기존 `tests/reading-calculations.test.ts`의 날짜 범위 회귀를 Given–When–Then 구조로 최소 보강했다. Step 02의 unit runner가 새 파일을 발견하고 실패를 전달한다는 증거를 재사용했다.

| 명령 | 결과 | 범위와 한계 |
| --- | --- | --- |
| `npm run test:unit` | exit 0; 8 파일 PASS, fail/skip/todo 0 | 신규 period 파일과 기존 계산 회귀 포함 |
| `TZ=Asia/Seoul npm run test:unit` | exit 0; 8 파일 PASS, fail/skip/todo 0 | UTC ISO `2026-06-10T00:05:00.000Z`의 formatTime=09:05 확인 |
| `TZ=UTC npm run test:unit` | exit 0; 8 파일 PASS, fail/skip/todo 0 | 같은 ISO의 formatTime=00:05 확인 |

- D01은 로컬 `dateKey`, 포함 범위와 역전 범위, 윤년 한 날짜·월말, 일요일 시작 주간·연말/연초, week 7일 이동, month 대상 월 1일, 주/월 라벨과 빈 라벨 fallback을 명시한다.
- malformed/존재하지 않는 날짜 문자열의 정책은 Q01이다. `type=date`의 정상 UI 경로는 유효 날짜만 제출하고 역전 범위는 폼이 선검사한다. 따라서 순수 helper에 타입 밖 문자열을 강제해 현재 관찰 결과를 계약으로 만들지 않았다. 외부 row/URL 경계에서 이 입력을 허용하거나 거부할 제품 계약은 후속 결정이 필요하다.
- 이번 step은 unit 범위만 검증했다. DB/RLS·실기기 및 후속 UI 배정 흐름 검증은 완료로 계산하지 않는다. commit/review와 Step 06은 시작하지 않는다.

## Step 06 Execution — 2026-10-14

기준 HEAD는 사용자 제공 `66b296c`이다. 제품 코드는 변경하지 않고 `tests/reading-drafts.test.ts`를 추가해 D02의 Book/Child 편집 필드 보존, null·빈 문자열, 반복 생성한 초안의 nested audio 참조 분리, `emptyReadingData`의 관찰 가능한 초기 shape와 UI 소비 정의/옵션을 검증했다. singleton 자체는 변경하지 않았고, Step 02의 unit runner 신규 파일 발견·실패 exit 전달·정리 증거를 재사용했다.

| 명령 | 결과 | 범위와 한계 |
| --- | --- | --- |
| `npm run test:unit` | exit 0; 9 파일 PASS, fail/skip/todo 0 | 신규 `reading-drafts.test.ts`를 포함한 node:test unit suite |
| `npm run check:contracts` | exit 0; Contract check passed | task/category 정의와 정적 계약 회귀 확인 |
| `npm run typecheck` | exit 0 | `reading-types` 및 `BookDraft`/`ChildDraft` type-only 계약 포함 |

- D02-N01은 `Book`의 초안 편집 필드(`id`, `contentType`, `series`, `title`, `volume`, `level`, `cover`, `audio`, `note`)와 `Child`의 모든 필드를 보존한다. `Book.active`는 `BookDraft`에 존재하지 않는 비편집 상태이므로 초안 계약에 넣지 않았다.
- D02-E01은 null 기본값, 빈 문자열, 원본·첫 초안·둘째 초안·`emptyBookDraft` 사이의 nested audio 분리를 확인한다. 초안 또는 원본 audio를 바꾼 뒤 다른 대상이 오염되지 않는 관찰 결과를 확인했고, 공유 singleton을 변경하는 테스트는 만들지 않았다.
- `emptyReadingData`는 빈 컬렉션/맵 shape만 읽는다. task label·`needsAudio`·category task 대응, UI가 순회하는 count/PASS-FAIL options만 검증하며 횟수·진행률 계산은 Step 08의 기존 책임과 중복하지 않았다.
- 타입상 불가능한 객체를 `as any`로 만들지 않았다. invalid 폼 입력은 U01, 외부 row 입력은 S01에서 검증한다. DB/RLS·실기기와 Step 07은 범위 밖이다. 제품 결함 RED→GREEN은 없고 기존 동작의 GREEN 계약 확인이다.
- 사용자 지시에 따라 commit, Step 07, 별도 code review는 수행하지 않았다.

## Step 07 Execution — 2026-10-14

기준 HEAD는 사용자 제공 `5dd5468`이다. 제품 코드는 변경하지 않고 기존 `tests/reading-calculations.test.ts`를 최소 확장했다. Step 02의 unit runner가 새/수정 테스트를 발견하고 assertion 실패를 nonzero로 전달하며 stale 산출물을 정리한다는 증거를 재사용했다.

| 명령 | 결과 | 범위와 한계 |
| --- | --- | --- |
| root 최종 `npm run test:unit` | exit 0; 127 PASS, fail/skip/todo 0 | `verification-artifacts/step07-unit-root-final.log`; 수정한 계산 회귀와 기존 node:test unit suite 포함 |

- D03은 일반 책의 표지/읽기/정따 준비 상태와 단어 읽기의 listen-only 준비 상태, `hasCustomCover`와 `isWordReadingMaterial`을 확인한다.
- D04는 빈 URL의 optional helper 허용과 자료 준비의 필수 입력 부족을 분리하고, http/https 허용 및 javascript/data/ftp/깨진 URL 거부를 확인한다.
- D05는 공백·대소문자 정규화 검색, series, 선택 제외, 검색 시 배정 이력 포함, 무검색 10/검색 20 상한, 역삽입 순서, 배열/Set 불변성 및 child/오늘/미래/날짜순 예정 목록을 확인한다. SQL wildcard 정책은 Q02 및 Step 12 store 경계에 유지했다.
- D06은 실제 UI가 허용하는 category/task만으로 일반 책/단어 읽기 활동, 기본 task, task 오디오 URL과 empty-task fallback을 확인했다. 타입 밖 category/task는 `as any`로 생성하지 않았으며, 해당 invalid 분류는 UI 경로상 적용 불가로 scenarios.md에 기록했다.
- 최초 실행은 테스트 fixture의 일반 책 `contentType` 누락으로 TypeScript compile FAIL이었다. fixture에 실제 도메인 값 `book`을 명시한 뒤 재실행해 PASS했으며, 제품 결함이나 제품 코드 수정은 없었다.
- code-review 최초 Standards P2는 GWT Then의 검증 대상 호출과 URL 정상/invalid 시나리오 결합 2건, Spec P3는 whitespace-only URL 허용과 일반 책 self task의 no-audio 2건을 지적했다. 모두 수정하고 stale scenarios 테스트명 P2까지 정정했으며 최종 Standards 0 findings, Spec 0 findings이다.
- DB/RLS·실기기·폼 저장/browser 흐름은 이번 순수 helper 범위 밖이며 각각 후속 Step 12, 19, 23, 24에 남긴다. commit, 별도 code review 및 Step 08은 사용자 지시에 따라 수행하지 않았다.

## Step 08 Execution — 2026-10-14

- 기준 HEAD `d2ff9f8`에서 tests/reading-calculations.test.ts와 tests/child-task-policy.test.ts만 확장했다. 제품·설정·의존성 코드는 변경하지 않았다.
- 최초 review findings: P1은 `focusListen`에 wordRead/copywork를 넣은 invalid domain fixture, P2는 `completedCount: 1`/`targetCount: 2`의 부분 완료 button 회귀 누락이었다. Standards는 quiz enabled/disabled와 GWT, 진행률·formatting 시나리오 결합을 지적했다. 후속 Standards finding은 task count·task count builder·completion/progress·policy/merge의 결합 case를 독립 GWT test로 나누도록 요구했다. 모두 테스트로 수정했고 최종 Standards 0 findings, Spec 0 findings으로 해소를 확인했다.
- D07은 explicit/legacy 1/0, 0/category 밖 task 제거, completion count, 목표 cap, 0 task, quiz 전용 pending/PASS/FAIL/disabled를 각각 확인한다. policy는 launch만/복귀/부분 완료/목표 완료, loading/error/기록 없음과 completion·audio snapshot의 count/returnedAt 비퇴행을 확인한다.
- D08은 유효한 regular `focusListen`(listen/shadow/self + FAIL quiz), regular `extraStudy`(copywork), `word-book-1` `extraStudy`(wordRead) 배정으로 복합 key, minutes/count/category/title/note와 assignment 입력 순서를 확인한다. `formatTime`의 로컬 시각 계약 때문에 최초 UTC fixture 기대 `00:xx`가 Asia/Seoul 실제 `09:xx`와 달라 실패했고, 고정 local datetime fixture로 정정 후 GREEN이었다. 이는 테스트 fixture 오류이며 제품 결함은 아니다.
- root 최종 `npm run test:unit` exit 0(9개 발견 파일 PASS, fail/skip/todo 0; `verification-artifacts/step08-unit-root-final.log`), `npm run check:contracts` exit 0, `git diff --check` exit 0을 확인했다. Step 02의 발견/실패 전달·fixture 독립 증거를 재사용했다. Phase 1 경계 `npm run verify` exit 0으로 check:contracts/check:sw/check:pwa/unit/typecheck/build 전체 PASS를 `verification-artifacts/phase01-verify.log`에 기록했다.
- invalid는 타입 밖 task/category/log 객체를 만들지 않는 N/A다. 외부 row는 S01, 저장 count 오류는 S07, 실제 링크 실행·브라우저/실기기는 U06/25 및 후속 단계에 남긴다. commit과 Step 09는 수행하지 않았다.

## Step 12 Execution — 2026-10-14

- 기준 HEAD는 사용자 제공 `9b8a66d`이며, `tests/reading-store-library.test.ts`만 추가했다. 제품 코드, migration, 설정, 의존성은 변경하지 않았다.
- 제한 query/RPC 대역은 `fetchBookManageData`, `fetchBookSeriesNames`, `fetchLibraryData`, `fetchAssignedBookIds`의 exact table/select/order와 operator/column/value filter multiset을 확인한다. started table과 `then` 실행 table을 분리해 예상 호출의 시작·실행을 모두 확인하며 Promise.all 호출 순서에는 결합하지 않는다.
- S04는 자료 유형 매핑, named/all series, title 검색과 현재 `%`/`_` raw `ilike` 전달, manage data null, series RPC의 trim/blank/dedup/sort·data null/error null no-fallback, RPC response error의 owner-scoped fallback과 fallback error/rejection, active-only/empty library, 배정 book ID의 dedup/data null/empty ID/error를 각각 Given–When–Then으로 기록했다. RPC Promise rejection은 현재 구현이 fallback하지 않고 동일 오류를 전파하는 계약도 구분했다.
- 최초 findings는 filter 순서 결합, `from` 뒤 실제 execute 미확인, plan 상태 접미사, fallback query rejection 및 null/empty 경계 공백이었다. filter multiset과 started/executed table 검증으로 순서·실행 문제를 해소했고, 접미사를 복원했으며 독립 fallback rejection·null/empty GWT를 추가했다.
- root 최종 `npm run test:unit` exit 0, 13개 발견 파일 PASS, fail/skip/todo 0 (`verification-artifacts/step12-unit-root-final.log`); `npm run check:contracts`·`npm run typecheck` exit 0, pane `npm run build` exit 0, `git diff --check` exit 0. 최종 Standards 0 findings, 최종 Spec 0 findings이며 제품 결함 RED 또는 제품 코드 변경은 없었다.
- 제한: RPC response error는 fallback하지만 RPC Promise rejection은 현재 구현상 직접 전파한다. raw `%`/`_` 검색은 Q02의 현재 `ilike` 전달 계약만 기록한다. 이 대역은 실제 DB, RPC SQL, migration 적용 또는 RLS를 실행하지 않는다.

## Step 14 Execution — 2026-10-15

- 제품 코드, migration, 설정, 의존성은 변경하지 않았다. `tests/reading-store-assignment-write.test.ts`(14개)와 `tests/reading-store-manual-log.test.ts`(7개), 합계 21개를 추가하고, inventory/scenarios/task/review 추적을 S06에 연결했다. Step 14는 Complete다.
- assignment 제한 mutation fake는 허용된 `assignments` table의 `upsert`/`update`/`delete`만 지원하고, manual-log fake도 `manual_logs`의 `insert`/`delete`만 지원한다. 각 plan에서 기대 event sequence를 도출해 `from → mutation → 각 eq filter → select → single → execute`와 정확히 비교하며, API별 select/single 유무와 filter 순서를 현재 체인 그대로 검증한다. 중복 `from`은 즉시 실패하고 예상 밖·중복·미실행 mutation, payload/options/filter/select/single 누락도 실패시킨다. 각 테스트는 한 시나리오와 Given–When–Then 주석을 가진다.
- S06은 bulk payload의 owner/모든 snake_case field/conflict key, quiz false의 `quiz_score: null`과 true의 score key 생략, 반환 row 및 빈 batch를 확인한다. PASS/FAIL, task counts와 quiz Y→N, 두 delete의 owner/id scope·성공 계약·대표 오류, manual log의 owner payload/exact select/single/매핑/빈 note·0분 및 실패를 각각 확인한다. 추가로 quiz save, manual save, manual delete의 독립 `{ error }` 전파와 task-count save의 독립 `{ data: null, error: null }` 전용 오류를 확인한다.
- invalid는 공개 TypeScript 입력 타입 밖 값을 강제하지 않아 N/A다. 실제 unique constraint, cascade, transaction atomicity, migration 적용과 RLS는 query fake가 실행하지 않는다. `deleteAssignment`의 0행은 현재 SDK response만으로 감지할 수 없어 성공/실패 정책으로 고정하지 않고 Q03 및 DB/RLS 후속으로 남긴다. 제품 결함은 발견하지 않았다.

| 명령 | 결과 | 범위 |
| --- | --- | --- |
| `TMPDIR="$PWD/verification-artifacts/tmp" npm run test:unit` | exit 0; 16 discovered files PASS, fail/skip/todo 0 | 신규 2 파일의 21 test와 기존 unit suite |
| `npm run check:contracts` | exit 0 | 정적 계약 |
| `npm run typecheck` | exit 0 | 테스트 source를 포함한 TypeScript 계약 |
| 개발 pane `npm run build` | exit 0 | Next production build |
| `git diff --check` | exit 0 | 공백 오류 없음 |

최종 Standards review와 Spec review는 각각 0 findings였다.

## Step 15 Execution — 2026-10-15

- Step 15은 Complete다. 제품 코드, migration, RLS, 설정 및 의존성은 변경하지 않았다. 기존 target test 68개와 client browser 7개는 이름·행동·assertion을 그대로 보존했다. target은 현재 80개이며, store query fake 추적 및 한국어 Given–When–Then 신규 12개만 추가했다.
- S07은 `fetchCompletion`의 정확 owner/assignment/task projection/`maybeSingle`, fetch Promise rejection 및 guarded save insert/update의 exact payload·scope·projection/`maybeSingle` query trace와 mutation/reconciliation Promise rejection을 보강했다. 기존 테스트가 최초 insert, expected-count update, invalid no-write, 23505 reconciliation, missing/old-count conflict, SQLSTATE rejected/non-SQLSTATE uncertain 및 반환 mapping을 이미 다룬다. `task-completion`의 새 transport rejection은 coordinator가 `uncertain`으로 구분하는 실제 연결을 확인한다.
- S08은 `saveAudioLaunch`, `fetchAudioLaunch`, `saveAudioReturn`의 정확 payload/filter/projection/terminal query를 별도 검사했다. launch DB error, fake의 null-data fallback rejection, Promise rejection과 fetch rejection도 추가했다. null-data fake는 `unwrap`의 앱 처리만 증명하며 실제 PostgREST 응답 형식을 증명하지 않는다. 기존 테스트가 launch의 새/기존 mapping, fetch row/null/DB error, return의 returned_at-only/0행/old launch/duplicate return 및 DB error/rejection을 다룬다. `audio-return` coordinator의 연타, 결과 지연, stale launch, scope/dispose callback 차단은 기존 회귀로 연결된다.
- query fake의 23505·expected-count·returned_at null 상태 전이는 앱이 보낸 요청과 모의 상태 전이의 증거일 뿐이다. 실제 Postgres unique constraint, conditional update, transaction/격리 원자성, migration 적용, RLS owner 격리는 실행하지 않았고 후속 DB/RLS 범위다.
- root 최종 Standards review와 Spec review는 각각 0 findings였다. 제품 결함과 제품 코드 변경은 없었다.

| 명령 | 결과 |
| --- | --- |
| `TMPDIR="$PWD/verification-artifacts/tmp" npm run test:unit` | exit 0; 16 discovered files PASS, fail/skip/todo 0 |
| `npm run test:audio-browser` | sandbox Chromium EPERM으로 최초 7 FAIL; 승인된 sandbox 밖 재실행 exit 0, 7 PASS |
| `npm run check:contracts` | exit 0; Contract check passed |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; Next production build |
| `TMPDIR="$PWD/verification-artifacts/tmp" npm run verify` | root exit 0; check:contracts/check:sw/check:pwa/test:unit/typecheck/build 모두 PASS, unit 271 pass·fail/cancelled/skipped/todo 0; `verification-artifacts/step15-verify-root-final.log` |
| root `npm run test:audio-browser` | sandbox Chromium EPERM 뒤 승인된 sandbox 밖 재실행 exit 0, 7 passed; `verification-artifacts/step15-audio-browser-root-final.log` |
| `git diff --check` | exit 0 |

## Step 17 Execution — 2026-10-15

- Step 17은 **Complete**다. 최종 Standards 0 findings, Spec 0 findings이며 제품 코드, migration, RLS, 설정과 의존성은 변경하지 않았다. callback 기존 2개 회귀는 보존하고 default next, 교환 오류, 외부 URL, protocol-relative 입력을 4개 추가했다. query 보존은 Q04의 미확정 정책이므로 결함/완료 근거에서 제외했다. protocol-relative 입력은 기본 `/`로 제한해야 하는 계약을 `test.fails`로 기록했다. 현재 결함은 same-origin `https://reading.invalid//outside.invalid/path`를 반환하는 redirect-path validation 결함이며 외부 open redirect는 아니다.
- 신규 `tests/server/auth-middleware.test.ts` 6개는 설정된 cookie `getAll`/`setAll`, 새 response의 cookie와 추가 header, `getUser`, 미설정, rejection, 실제 request cookie write 실패 전파, root delegate와 matcher 정적 제외를 독립 Given–When–Then으로 검증한다. request cookie는 갱신 전 읽고 갱신 후 response로 전달되는 경계를 구분했다.
- 기존 실제 Next 비로그인·합성 cookie 로그인 SSR 2개는 변경하지 않았다. `tests/browser/next/auth-routes.spec.mjs`는 env 없는 임시 Next 복사본의 설정 안내 및 실제 `/auth/error` HTTP를 2개 추가한다. async Page를 DOM에 직접 렌더링하지 않았다. fixture의 context, Auth HTTP, Next process group, temporary root 및 failure artifact 정리는 기존 finally 계약을 재사용한다.
- root `npm run test:server`는 4 files, 32 PASS + 1 expected-fail로 exit 0이다 (`verification-artifacts/step17-server-root-final.log`). sandbox 안 Chromium은 `sandbox_host_linux.cc` EPERM으로 시작하지 않아, 승인된 sandbox 밖 root `npm run test:browser:next`로 재실행해 기존 2개와 신규 2개, 총 4 PASS를 확인했다 (`verification-artifacts/step17-browser-next-root-final.log`). root `npm run typecheck`, `npm run check:contracts`, `npm run build`, `git diff --check`도 모두 exit 0이다. 과거 build와 병렬 최초 typecheck의 TS6053은 `.next/types` 생성물 경합이며 단독 재실행에서 해소됐다.
- 실제 Supabase OAuth, JWT 서명, session serialization 또는 browser persistence, DB/RLS는 검증하지 않았다. callback next의 query/hash와 getUser 오류의 UI 정책은 Q04에 미확정으로 남긴다.

## Step 18 Execution — 2026-10-15

- Step 18은 **Complete**다. 제품 코드, Supabase 설정·migration·의존성은 변경하지 않고 `auth-panel` 기존 테스트를 확장하고 `signed-in-shell` 테스트를 추가했다. 각 test는 Given–When–Then으로 독립 실행하며, file-local `beforeEach`와 component setup의 afterEach가 SDK/router/mock, env, global window, DOM과 storage를 복원한다.
- A04-N01은 Google `provider: "google"`, 현재 origin callback redirect와 `select_account`를 확인하고, A04-B01은 OAuth 요청 중 Google·로컬 로그인 버튼이 모두 비활성화되는 경계를 확인한다. A04-E01은 OAuth 오류 표시와 재시도를, N02와 E02–E06은 development flag/production·false flag 가시성, localhost Anonymous 성공 refresh, non-local hostname 차단, Anonymous disabled 한국어 안내 및 일반 오류를 확인한다.
- A04-N03/E07/E08은 ReadingManagerClient 대역을 통해 logout 성공 뒤 transition router refresh, 오류 시 상태 표시와 refresh 금지, `isPending`의 `isSigningOut` 전달을 확인한다. 실제 Google/OAuth 네트워크는 호출하지 않았고 Supabase browser factory, router, browser hostname 및 ReadingManagerClient를 명시 대역했다.
- 최초 test 실행은 test fixture의 Supabase 공개 env 누락과 하네스에 없는 jest-dom matcher 때문에 실패했다. fixture env와 기본 Vitest assertion으로 정정한 뒤 GREEN이며, 제품 결함이나 제품 코드 수정은 없었다. jsdom은 origin 간 navigation을 현실적으로 제공하지 않으므로 non-local hostname은 클릭 시점 `window.location.hostname` 대역으로만 확인한다. 실제 OAuth redirect/session persistence, DB/RLS는 이 컴포넌트 대역 범위 밖이다.

| 명령 | 결과 |
| --- | --- |
| `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run test:component` | exit 0; 4 files/17 tests PASS; `verification-artifacts/step18-component-root-final.log` |
| `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run typecheck` | exit 0 |
| `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run check:contracts` | exit 0; Contract check passed |
| `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run build` | exit 0; Next production build PASS |
| `git diff --check` | exit 0 |
| root `npm run verify` (Phase 3 경계) | exit 0; `check:contracts`·`check:sw`·`check:pwa`·`test:unit`·`typecheck`·`build` PASS; `verification-artifacts/step18-verify-root-final.log`. component/server/browser는 이 명령에 포함되지 않는다. |

- 최종 Standards 0 findings, Spec 0 findings. root 개별 `typecheck`·`check:contracts`·`build`·`git diff --check`도 exit 0이다.

## Step 23 Execution — 2026-10-16

기준 커밋은 사용자 제공 `6bdf0cd`다. 제품 코드는 변경하지 않고, `tests/browser/client/profile-material.spec.mjs`와 실제 `ReadingManagerClient` bundle/HTTP fixture를 추가했다. 각 test는 새 browser context와 독립 in-memory children/books 상태를 사용하며, fixture는 등록한 REST path/method만 응답하고 request histories·body·query를 artifact로 남긴다.

| 명령 | 결과 |
| --- | --- |
| focused `profile-material.spec.mjs` (고정 TMPDIR/Playwright browser path) | 15 PASS: 정상 5, 경계 5, invalid/failure 5 (`verification-artifacts/step23-focused-root-final.log`) |
| `npm run test:browser:client` (같은 환경) | 22 PASS: 신규 U01 15 + 기존 audio 7 (`verification-artifacts/step23-client-root-final.log`) |
| `npm run test:audio-browser` (같은 환경) | 7 PASS: `audio-completion.spec.mjs`만 명시 실행 (`verification-artifacts/step23-audio-root-final.log`) |
| `npm run typecheck` / `npm run check:contracts` / `npm run build` | 모두 PASS (`verification-artifacts/step23-typecheck-root-final.log`, `verification-artifacts/step23-contracts-root-final.log`, `verification-artifacts/step23-build-root-final.log`) |
| `git diff --check` | PASS |

- 정상: U01-N01–N05가 아동 save/edit/profile 전환, 일반 책 save/edit, data URL 표지 표시와 ready 검색, active 전환, 단어 읽기 유형 필드를 검증한다.
- 경계: U01-E01–E05가 빈 profile, 초기 로딩 뒤 손상 profile의 안전 fallback·정리, 표지/읽기 링크/정따 링크가 각각 미완성인 일반 책의 독립 attention 상태를 검증한다.
- 잘못된 입력/실패: U01-F01–F05가 빈 아동 이름, 일반 책 필수값 누락, 유효 필수값의 URL 오류 no-write, children/books HTTP 실패의 성공 목록 미반영과 오류 안내를 검증한다.
- 신규 제품 결함이나 expected-fail은 없다. 최초 locator 및 기본 아이콘 허용 path 누락은 test/fixture 결함으로만 교정했다.
- 최종 Standards review 0 findings, Spec review 0 findings. 표지는 data URL REST row의 img 표시만 검사한다. Storage/DB/RLS, Auth, QR/카메라, 실기기 및 `npm run verify`는 이 Step/Phase 범위 밖이며 `npm run verify`는 Phase 5 종료가 아니므로 미실행이다.

## Final Verification

구현 완료 시 채울 항목:

- 기준 소스와 최종 변경 범위.
- 필수 시나리오 → 실제 테스트 경로/이름 → 발견/실행 결과.
- npm run verify 및 구현 후 verify:all의 로그.
- source 커버리지 공백·제외와 기존 대비 후퇴 여부.
- 실패/skip/todo·해결된 결함·별도 수정 승인 기록.
- 실제 DB/RLS·OAuth·실기기 미검증 범위.
- docs 승격과 후속 인계.

필수 자동 범위가 통과하면 Status를 정확히 Passed로 바꾼다. DB/RLS·실기기 후속 미검증은 별도로 남긴다. 핵심 테스트 실패나 실제 실행 누락을 미검증 예외로 숨기지 않는다.

## Promotion Candidates

- 테스트 계층별 파일 위치와 명령: docs/testing-guidelines.md.
- fixture 격리, 서버/클라이언트 browser 경계, 실행/결과 artifact: docs/development-harness.md.
- 테스트 운영 규칙이 매 세션에 필요해진 경우만 AGENTS.md에 최소 반영.
- 도메인 용어·장기 ADR: 현재 새 항목 없음.
