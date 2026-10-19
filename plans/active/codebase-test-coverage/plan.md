# 전체 코드 테스트 작성 계획

## Goal

운영 코드의 주요 동작을 자동 테스트로 보호하고, 각 파일과 시나리오의 검증 책임을 추적할 수 있게 한다. 기존 테스트를 살리면서 빈틈을 작은 step으로 채운다.

**사용자가 전체 계획을 step 순서로 구현하고 각 step 완료마다 커밋하도록 요청했다.** 루트 오케스트레이터가 검토·커밋·다음 step 전달을 맡고, 개발 pane은 전달받은 step만 구현한다. 개발 pane은 루트가 전달한 step만 수행하며 커밋은 루트가 정리한다. 초기 untracked 계획 문서 38개는 사용자 제공 입력으로 첫 step 커밋에 함께 포함한다. 신규 명령·테스트 경로·의존성 추가는 해당 step 구현 전까지 제안이며, 아직 구현하지 않은 하네스를 실행했다고 표시하지 않는다.

계획은 **8개 phase, 33개 step**이다. 한 step은 하나의 응집된 계약을 다루며, 필요하면 같은 계약의 여러 API를 별도 테스트 파일로 나눈다. 단계별로 완료 기준을 만족한 뒤 다음 단계로 넘어간다.

## Context

작성 기준일: 2026-10-13.

- Next.js 15 / React 19 / TypeScript / Supabase Auth·Postgres / PWA 앱이다.
- 현재 단위 러너는 TypeScript 컴파일 후 node:test로 실행한다. 6개 테스트 파일이 있으며 계산·완료·복귀·선택 정책·저장 일부를 검증한다.
- 일부 reading-period 함수도 기존 계산 테스트에서 다룬다. 테스트 파일이 없다는 이유만으로 미검증이라고 단정하지 않는다.
- 브라우저 검사는 scripts/smoke-audio-completion.mjs의 7개 오디오 회귀 시나리오다. 실제 ReadingManagerClient를 esbuild로 번들링하고 HTTP 응답을 대체한다. 실제 Next 서버·App Router·middleware 검사는 아니다.
- 현재 test:unit·contracts·SW·PWA·typecheck·build를 묶은 verify가 있다. 컴포넌트·hook·서버 전용 러너, 전체 브라우저 러너, 코드 커버리지 gate는 없다.
- reading-store.ts는 906줄, reading-manager-client.tsx는 2,792줄이다. 파일 전체를 재작성하기보다 공개 API와 사용자 동작을 나눠 검증한다.
- 로컬 DB가 없다는 사용자 설명을 반영한다. 현재 계획에서 로컬 Supabase 구축·실제 DB·RLS 검증은 필수 단계에 넣지 않는다.
- 파일별 조사 결과는 [inventory.md](inventory.md), 핵심 기대 동작은 [scenarios.md](scenarios.md), 검증 기록은 [review.md](review.md), 실연동·실기기 항목은 [follow-up.md](follow-up.md)에 둔다.

## Decisions

### 합의와 범위 조정

| 항목 | 기준 |
| --- | --- |
| 전체 코드의 의미 | 주요 동작을 여러 계층에서 검증하고 모든 운영 파일에 검증 책임 또는 제외 이유를 지정한다. 코드 커버리지 100%를 목표로 삼지 않는다. |
| 초기 DB 범위 | 사용자는 주요 동작 + 로컬 DB/RLS 검증을 선택했다. 이후 로컬 DB가 없다고 알려 범위를 조정한다. |
| 현재 DB 범위 | 로컬 DB가 없는 현재 환경을 기준으로 저장소 대역·HTTP fixture로 앱 계약만 검증한다. 실제 DB/RLS는 후속으로 분리한다. 별도로 로컬 구축을 요청하면 후속 계획을 작성한다. |
| 실기기 범위 | 사용자가 자동 테스트까지 완료하고 실기기는 후속 확인하도록 선택했다. |
| 현재 실행 권한 | 전체 계획의 순차 구현과 step별 자동 커밋을 승인받았다. 검토·커밋·다음 step 전달은 루트 오케스트레이터가 수행한다. 개발 pane은 전달받은 step만 수행한다. push·배포 권한은 없다. DB/RLS·실기기 제외는 유지한다. |

### 검증 계층

| 계층 | 목적 | 대역/실행 경계 |
| --- | --- | --- |
| 단위 | 순수 계산·policy·coordinator·store 공개 API | node:test 유지, 고정 시간과 SDK query 대역 |
| 컴포넌트·hook | 표시·조작·effect·cleanup | Vitest + React Testing Library + DOM 환경 제안 |
| 서버 경계 | route·middleware·cookie·env | 별도 Node 환경, Next/SDK 경계 대역 |
| 클라이언트 브라우저 | 실제 UI 연결·폼·저장 응답·레이아웃 | Playwright + HTTP fixture, 기존 번들 하네스 확장 |
| 실제 Next 브라우저 | 서버 페이지·인증 분기·라우트·PWA | 로컬 Next 서버와 로컬 Auth HTTP 대역; 운영 연결 없음 |
| 정적 계약 | types·manifest·자산·설정 | 기존 contracts/PWA/typecheck/build |
| 후속 실연동 | 실제 SQL·RLS·Auth·Android | 현재 자동 완료 조건에서 제외, follow-up 명시 |

비동기 Server Component는 UI 단위 러너에 억지로 렌더링하지 않고 실제 Next 서버 검사에 맡긴다. Next 공식 문서도 async Server Component의 Vitest 제약과 E2E 검사를 안내한다. [Next Vitest 안내](https://nextjs.org/docs/app/guides/testing/vitest), [Next Playwright 안내](https://nextjs.org/docs/app/guides/testing/playwright). 문서는 최신판이므로 현재 저장소의 Next 15와 호환되는 설정은 Phase 0에서 별도로 확인하며 프레임워크 업그레이드는 하지 않는다.

DB/RLS 후속 검증은 로컬 환경과 별도 실행 계층이 필요하다. Supabase는 DB 테스트와 앱 통합 테스트의 격리 방식이 다름을 안내한다. [Supabase 테스트 개요](https://supabase.com/docs/guides/local-development/testing/overview). DB 테스트 대역은 SQL·정책을 실행하지 않으므로 이 계획의 통과 결과를 RLS 보장으로 해석하지 않는다.

### 테스트 작성 원칙

1. 먼저 기대 결과를 도메인 규칙과 요구사항에서 정한다. 정상·경계·잘못된 입력을 검토하고 각 테스트에 Given–When–Then 주석을 둔다.
2. 기존 테스트는 재사용하고 공백만 추가한다. 구현과 같은 계산식을 기대값으로 복사하거나 큰 DOM snapshot으로 모든 동작을 대신하지 않는다.
3. 타입상 불가능한 값을 as any로 강제하지 않는다. invalid 입력은 실제 폼·URL·env·row·통신 경계에서 검증한다. 적용 불가 분류에는 이유를 적는다.
4. 날짜·시간·ID·응답 순서를 고정한다. 지연 요청은 제어 가능한 Promise, timer는 제어 가능한 시계를 사용한다.
5. query 대역은 이번 코드가 실제 사용하는 연산만 지원한다. 범용 Supabase 모조 구현을 만들지 않는다. 예상하지 못한 연산/HTTP 호출은 실패시킨다.
6. 테스트 단위마다 fixture·DOM·storage·env·mock·event listener·timer를 복원한다. 브라우저 context를 분리한다.
7. 필수 UI 브라우저는 Chromium으로 시작한다. 다른 엔진의 전면 매트릭스와 이미지 픽셀 완전일치는 요구하지 않는다.
8. node 단위 테스트와 신규 UI/서버/브라우저 테스트의 탐색·컴파일 경계를 분리한다. 미import 모듈을 커버리지 보고에서 숨기지 않는다.

### 테스트 중 발견한 결함

기존 코드에 테스트를 추가하는 것은 처음부터 RED일 필요가 없다. 요구사항에 맞는 기존 동작이면 새 테스트의 GREEN과 실행 발견을 확인한다.

결함이 발견되면 실패 시나리오와 기대 결과를 먼저 기록한다. 기능 수정·스키마 변경·대규모 분리는 이 테스트 계획에 몰래 포함하지 않는다. 별도 수정 task의 범위와 승인을 정한 후 회귀 테스트의 RED → 수정 → GREEN을 남긴다. 필수 계약이 실패하는 상태를 테스트 계획 완료로 표시하지 않는다. 테스트를 통과시키려고 기대 결과를 결함에 맞추지 않는다.

단순한 테스트 설정·fixture 도입은 각 step의 범위다. 앱 코드 분리가 필요하면 기존 공개 동작을 유지하는 최소 변경의 이유와 대안을 제시한다. 범위가 커지면 작업을 나눠 확인한다.

### 도메인 용어

기존 [docs/CONTEXT.md](../../../docs/CONTEXT.md)의 Activity Category, Task, Copywork, Extra Study를 유지한다. 활동 구분과 실제 아동 행동을 혼용하지 않는다. 링크 열기·복귀·수동 완료도 다른 사건이다. 이번 계획은 새 도메인 개념을 도입하지 않아 glossary를 수정하지 않는다. 도구 선택은 Phase 0에서 쉽게 바꿀 수 있는 하네스 결정이므로 ADR은 만들지 않는다.

## Out of Scope

- 운영 DB/계정 사용, 로컬 DB 구축, 실제 migration 적용·RLS·RPC 실행 검증.
- 실제 Google OAuth 계정 로그인, Android 설치·실제 카메라·외부 앱 전환의 실기기 증명.
- 새 학습 규칙, 자동 완료, 오프라인 쓰기 큐, 보안 모델 변경.
- 커버리지 수치만 올리기 위한 불필요한 export·분기·테스트, 전체 앱/테스트 재작성.
- ignored 루트 legacy app.js/index.html/manifest.webmanifest/sw.js와 생성 산출물.
- 새 CI 플랫폼·배포 체계, push·배포, 기존 계획의 무관한 작업 재수행. step별 커밋은 승인 범위이며 루트 오케스트레이터가 수행한다.

## Tasks

### Phase 0 — 검증 기반과 실행 환경

완료 조건: 서로 독립적인 unit/component/server/browser 실행이 준비되고 신규 테스트 발견·실패 전달을 확인한다.

- [Step 01 — 검증 계약과 전체 코드 목록 확정](tasks/01-scope-matrix.md)
- [Step 02 — 단위 테스트 실행기와 공통 fixture](tasks/02-unit-runner-fixtures.md)
- [Step 03 — 컴포넌트·hook·서버 테스트 기반](tasks/03-component-server-harness.md)
- [Step 04 — 브라우저 fixture와 실제 Next 실행 구분](tasks/04-browser-harness.md)

### Phase 1 — 도메인과 순수 로직

완료 조건: 자료·활동·task·퀴즈 및 날짜 경계가 명시된 기대 결과로 검증된다.

- [Step 05 — 날짜와 주·월 경계](tasks/05-dates-periods.md)
- [Step 06 — 초기 데이터와 입력 초안 복사](tasks/06-drafts-data-contract.md)
- [Step 07 — 자료 준비 상태와 배정 후보](tasks/07-materials-candidates.md)
- [Step 08 — 횟수·진행률·활동 기록](tasks/08-tasks-progress-logs.md)

### Phase 2 — Supabase 저장소 대역 검증

완료 조건: 모든 reading-store 공개 API가 row 매핑·소유자 범위·오류·충돌 시나리오에 연결된다.

- [Step 09 — 전체·프로필 조회와 row 매핑](tasks/09-store-full-profile.md)
- [Step 10 — 오늘·예정 배정의 embedded 데이터 조회](tasks/10-store-child-upcoming.md)
- [Step 11 — 부모 활동 범위 조회](tasks/11-store-parent-period.md)
- [Step 12 — 자료 관리·시리즈·배정 이력 조회](tasks/12-store-library.md)
- [Step 13 — 아동·자료 저장과 활성 상태](tasks/13-store-child-book-write.md)
- [Step 14 — 배정·퀴즈·수동 기록 저장](tasks/14-store-assignment-log-write.md)
- [Step 15 — 완료·실행 저장 기존 회귀 보강](tasks/15-store-completion-audio.md)

### Phase 3 — 인증과 Next 서버 경계

완료 조건: 인증 설정·쿠키·callback·페이지 분기·로그인/로그아웃 요청이 검증된다.

- [Step 16 — 인증 설정과 Supabase client 경계](tasks/16-auth-env-clients.md)
- [Step 17 — 인증 callback·middleware·서버 페이지](tasks/17-auth-callback-middleware.md)
- [Step 18 — 로그인·로그아웃 UI](tasks/18-auth-ui.md)

### Phase 4 — 컴포넌트와 hook

완료 조건: 사용자 조작과 React 수명주기·storage·timer·이벤트 정리가 검증된다.

- [Step 19 — 배정 picker와 편집·퀴즈 컴포넌트](tasks/19-assignment-components.md)
- [Step 20 — 완료 안내·활동 셀·자료 표시](tasks/20-feedback-report-components.md)
- [Step 21 — 배정 선택 복원 hook](tasks/21-selection-hook.md)
- [Step 22 — 완료·복귀 hook 수명주기](tasks/22-task-request-hook.md)

### Phase 5 — 사용자 흐름 회귀

완료 조건: 자료 등록→배정→아동 완료→부모 기록이 HTTP 대역 기반으로 재현된다.

- [Step 23 — 프로필·자료 등록과 관리 흐름](tasks/23-profile-material-flow.md)
- [Step 24 — 배정 생성·갱신·편집·삭제 흐름](tasks/24-assignment-flow.md)
- [Step 25 — 아동 학습과 완료·퀴즈 흐름](tasks/25-child-completion-flow.md)
- [Step 26 — 부모 활동표·수동 기록·출력](tasks/26-report-manual-log-flow.md)

### Phase 6 — 이미지·QR·PWA·모바일

완료 조건: QR 실제 판독·브라우저 API 경계·SW 실행·모바일 화면을 자동 검사한다.

- [Step 27 — 표지 압축과 QR 이미지 판독](tasks/27-cover-qr.md)
- [Step 28 — 카메라·QR 입력 수명주기](tasks/28-camera-upload.md)
- [Step 29 — 서비스워커 캐시의 실행 동작](tasks/29-service-worker.md)
- [Step 30 — 모바일 레이아웃과 접근 가능한 조작](tasks/30-mobile-layout.md)
- [Step 30a — 모바일 자료·배정 폼의 가로 넘침 수정](tasks/30a-mobile-form-width.md) — 새로 발견한 결함의 최소 수정안, 승인 대기

### Phase 7 — 하네스와 최종 검증

완료 조건: 필수 자동 suite 전체 통과, 코드/시나리오 대응표 갱신, 후속 한계 인계를 완료한다.

- [Step 31 — 개발 하네스 스크립트 회귀](tasks/31-harness-scripts.md)
- [Step 31a — 기존 expected-fail 결함 최소 수정](tasks/31a-existing-regressions.md) — 별도 승인된 수정, Step 32 전에 수행
- [Step 32 — 통합 검사와 커버리지 공백 점검](tasks/32-verification-gates.md)
- [Step 33 — 계획 대비 리뷰와 후속 인계](tasks/33-review-handoff.md)

## Execution Order

기본 순서는 Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7이다. 각 task의 Blocked By를 실제 선행 조건으로 사용한다. 서로 무관한 테스트 파일도 기본은 순차 작업하며 사용자가 요청하지 않으면 병렬 agent를 만들지 않는다.

Phase 0 완료 뒤 순수 로직부터 검증하고 store 대역에 필요한 fixture를 다듬는다. UI 전체 흐름은 관련 컴포넌트와 store 계약이 준비된 뒤 작성한다. Step 04의 실제 Next 서버용 Auth 대역 feasibility는 초기에 확인해 서버 페이지 검증을 마지막에 미루지 않는다.

### 실행 체크포인트 — 2026-10-20

Step 01–31과 승인된 Step30a는 Complete다. Step 28에서 재현한 play 이후 스캔 타이머 재생성은
별도 [Step 28a](tasks/28a-qr-scan-cancellation.md)로 최소 guard 수정을 승인받아
RED → GREEN을 확인했다. 새 사용자 요청으로 Step 29부터 재개해 Step 29의 구현·독립 검증을 마쳤다.
Herdr 구현 `wY:p5`/테스트 `wY:p6`은 모두 GPT-6.1-Sol·medium이다. 한도로 중단했다가 사용자가 한도 복구를 알려 같은 설정으로 Step 30만 재개했다.
Step30에서 재현한 모바일 등록/배정4 RED는 사용자 “그렇게 하자” 승인(2026-10-19)의 Step30a에서
동일 테스트 source/assertion을 유지한 최소 CSS 수정으로21 PASS가 됐다. Phase6 verify와 프로젝트별
browser 검증·최종 검토를 완료했으며 초기 전체 실행의 U06 테스트 동기화 실패/보완은 review.md에 구분 기록한다.
Step31은 신규59개를 포함한 독립 harness87 PASS와 typecheck/contracts/PWA PASS·최종 검토 뒤
`26c4295`로 커밋했다. Step31a는 2026-10-19 여섯 일반 assertion RED 보존 후 한도로 중단했고,
2026-10-20 사용자 재개 지시에 따라 승인된 네 제품 최소 수정과 동일 assertion GREEN을 완료했다.
focused component22/server callback6/print1 PASS, diff-check PASS다. Step31a 구현 Complete이며
Step31a는 독립 component110/server33/parent16 및 verify unit276/typecheck/build PASS와 최종 검토 뒤
`dae764b`로 커밋했다. 모델 설정을 유지하며 Step32 독립 검증과 Step33 문서 인계까지 마쳤다.

Step32는 기존 verify 보존·고정 순차 fast/all·분리 coverage 구현과 focused20/coverage276·110·33 PASS를 확보했다.
실측 파일별 baseline과 source 누락/새파일/후퇴 거부를 확인했다. 2026-10-20 root 지시로 source/config/baseline을
동결한 뒤 독립 verify:fast(24.83초) → verify:all(258.86초) → test:coverage(15.28초)를 모두 exit 0으로
완료했다. 일반 PASS는 unit276/component110/server33/harness99/browser121이며 skip/todo/expected-fail은 0이다.
Step32는 Complete, Step33 문서 인계까지 완료했다. 원본14/31/31 source와 baseline 불변도 독립 감사했다.

### Step 공통 완료 규칙

- 상태는 Pending → In Progress → Complete로 기록한다. 계획 작성 시에는 모두 Pending이었으며 각 task Execution Record와 review.md에 진행·최종 검증 결과를 기록했다.
- 하나의 step에서 새 테스트 파일/공개 API/사용자 계약을 명확히 적고 unrelated refactor를 섞지 않는다.
- 정상·경계·invalid 사례의 적용 여부와 요구사항 근거를 기록한다.
- 관련 최소 검사부터 실행한다. 한 phase 종료 시 기존 verify와 그 phase에서 준비된 신규 suite를 실행한다.
- 실패·미실행·skip을 이유 없이 성공으로 계산하지 않는다. 좁은 검사만 실행한 결과를 전체 통과로 보고하지 않는다.
- test source 자체가 typecheck/build를 깨뜨리지 않는지 확인한다.
- 결과는 task Execution Record와 review.md에 명령·환경·PASS/FAIL·artifact·발견 결함으로 남긴다.

## Required Verification

### 현재 검증 명령과 최종 증거

- `npm run verify`: 기존 contracts/SW/PWA/unit/typecheck/build 순서를 보존한다.
- `npm run verify:fast`: build/browser 제외 필수 계층, 독립24.83초 exit0.
- `npm run verify:all`: verify → component → server → harness → 전체 browser, 독립258.86초 exit0.
- `npm run test:coverage`: unit(c8)/component(V8)/server(V8) 분리·baseline 검사, 독립15.28초 exit0.
- 개별 unit/component/server/harness/browser·audio-browser 및 contracts/SW/PWA/typecheck/build 명령도 유지한다.

최종 source는 `ae94e04`이며 Step33은 문서만 변경한다. 독립 실행 로그는
`verification-artifacts/step32-independent-{fast,all,coverage,audit}.log`다.
unit276/component110/server33/harness99/browser121 일반 PASS, skip/todo/expected-fail0.
실제 DB/RLS·OAuth·Android 실기기 확인은 follow-up.md 범위이며 이 자동 PASS에 포함하지 않는다.
기존 verify를 변경하지 않는 결정을 확정했다. CI 연결은 별도 요청 범위다.

### 계획 완료 기준

- [x] inventory.md의 모든 운영 파일에 실행 가능한 검증 책임 또는 합의한 제외 이유가 있다.
- [x] scenarios.md의 필수 자동 시나리오에 테스트 경로·결과를 연결했고 모두 통과한다.
- [x] reading-store의 모든 공개 함수에 매핑·조회/쓰기 범위·오류 처리 검증이 있다.
- [x] 기존 단위 6개 파일과 오디오 7개 브라우저 회귀가 보존된다.
- [x] 새 테스트의 단독/전체 실행, 신규 파일 발견, 실패 exit code를 확인한다.
- [x] 날짜·storage·env·mock·timer 상태 누출이 없고 미import 모듈 커버리지를 확인한다.
- [x] npm run verify와 구현 후 verify:all이 통과한다.
- [x] 실제 DB/RLS·실기기·OAuth의 미검증 범위를 명시한다.
- [x] 발견 결함이 필수 기대 동작을 깨뜨리지 않으며 구현 리뷰와 문서 승격을 완료한다.

커버리지는 공백을 찾는 증거다. 초기 수치를 측정하지 않은 채 임의의 전역 퍼센트 gate를 만들지 않는다. Step 02에서 source 범위/baseline, Step 32에서 기존 대비 후퇴 방지 방식을 기록한다. 핵심 시나리오 누락은 높은 커버리지로 상쇄하지 않는다.

## Planning Verification

계획 작성 당시 npm run plan:workflow/test:unit/check:contracts를 실행했다. 이후 Step01–33과 승인된 추가 step을 완료했다. 최종 자동 검증은 위 Step32 로그를 재사용하며 Step33 문서 감사/계약·diff 결과와 후속 인계는 review.md에 기록한다.
