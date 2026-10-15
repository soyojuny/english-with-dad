# 전체 코드 검증 책임 목록

## 기준과 판정

2026-10-13에 현재 저장소를 조사했다. Step 01에서 운영 파일/공개 API와 **구현 대상 배정표**를 대조했다. 계약 목록 확정은 완료했지만 전체 런타임 검증 완료 결과가 아니다. 각 행의 시나리오 ID는 [시나리오 표](scenarios.md)의 테스트 경로·기존 증거·Step별 실행 결과에 연결된다. 후속 실행 결과는 그 표와 task Execution Record에 갱신한다.

기존 있음 = 직접 또는 기존 테스트 파일에 함께 검증된 동작이 있다. 정적 검사 = 구문/텍스트/타입/빌드 확인이며 런타임 검증을 뜻하지 않는다. 모든 파일에 테스트를 1개씩 기계적으로 생성하지 않고 관찰 가능한 행동이 있는 적절한 계층을 지정한다.

## 앱과 도메인

| 파일 | 현재 확인한 검증 | 추가 책임 / step | 시나리오 / 테스트·결과 참조 |
| --- | --- | --- | --- |
| lib/reading-types.ts | typecheck, contracts | 타입 전용; 06·08의 행동 계약 및 전체 typecheck | D02(06 2026-10-14 PASS)·D06·D07·D08 (타입 전용) |
| lib/reading-data.ts | dateKey: reading-period.test.ts, definitions/initial data: reading-drafts.test.ts, contracts | 정의 규칙·초기 데이터, 08 | D01(05 PASS)·D02(06 2026-10-14 PASS)·D06·D07(08 최종 review PASS)·U05 |
| lib/reading-calculations.ts | datesInRange/formatDate 및 자료 준비·URL·후보·활동/예정 목록·횟수/진행률/활동 로그: reading-calculations.test.ts; formatDate/formatTime: reading-period.test.ts | D07·D08 순수 helper 완료; UI 보고는 후속 | D01(05 PASS)·D03–D06(07 2026-10-14 PASS)·D07·D08(08 최종 review PASS)·U06 |
| lib/reading-period.ts | reading-period.test.ts | 주/월/연말/윤년과 이동·라벨 경계, 05 완료 | D01(05 PASS) |
| lib/reading-drafts.ts | reading-drafts.test.ts | null 기본값·복사·참조 오염 | D02(06 2026-10-14 PASS) |
| lib/child-task-policy.ts | child-task-policy.test.ts | 완료 표시·snapshot D07 완료; 선택/hook 범위는 후속 | D07(08 최종 review PASS)·H01·H03·U06 |
| lib/task-completion.ts | task-completion.test.ts | 기존 비동기/결과 불명확 회귀 유지, 15 | S07·H03·U07 |
| lib/audio-return.ts | audio-return.test.ts | 이벤트·첫 복귀·이전 응답 회귀 유지, 15 | S08·H03·U06 |
| lib/cover-image.ts | 직접 자동 테스트 없음 | Image/canvas/URL 경계·실제 브라우저, 27 | M01 |
| lib/qr-reader.ts | 직접 자동 테스트 없음 | 경계 대역 + 실제 jsQR/canvas fixture, 27 | M02 |
| app/use-child-assignment-selection.ts | policy/브라우저 간접 검사 | effect·storage 예외·scope 수명주기, 21 | H01·H03 |
| app/use-child-task-requests.ts | coordinator/브라우저 간접 검사 | timer 경계·listener/cleanup·late response, 22 | H02·H03·U07 |
| app/assignment-book-picker.tsx | 수동 UI 지침 | 선택·활동·폼 전달·rerender, 19 | C01·D06 |
| app/assignment-edit-form.tsx | 수동 UI 지침 | 횟수·fallback·퀴즈·취소/제출, 19 | C01·D06 |
| app/assignment-quiz-score.tsx | 수동 UI 지침 | PASS/FAIL 선택·표시, 19 | C02 |
| app/task-completion-feedback.tsx | 오디오 브라우저 일부 간접 검사 | 상태·role·버튼/callback, 20 | C03 |
| app/activity-log-cell.tsx | 수동 UI 지침 | 그룹·합계·퀴즈·수동 삭제, 20 | C04·D08·U08 |
| app/material-thumb.tsx | 수동 UI 지침 | 이미지 대체 표시·alt·메타, 20 | C04 |
| app/reading-manager-client.tsx | 오디오 브라우저 7개 흐름 | 초기 로딩·프로필·자료·배정·학습·보고서·미디어·SW, 23–30 | U01·U02·U03·U04·U05·U06·U07·U08·U09·M03·P02 |
| app/auth-panel.tsx | 수동 로그인 | OAuth/로컬 요청·가시성·오류, 18 | A04 |
| app/signed-in-shell.tsx | 수동 로그인 | logout·refresh·오류, 18 | A04 |
| app/page.tsx | build | 실제 Next 서버 페이지의 설정/인증 분기, 17 | A03 |
| app/auth/callback/route.ts | build | code 교환·redirect·headers, 17 | A02 |
| app/auth/error/page.tsx | build | 실제 오류 페이지·홈 링크, 17 | A03 |
| app/layout.tsx | build, PWA 정적 검사 간접 | lang·metadata·viewport·manifest, 30 | P02 |
| styles.css | build 및 수동 UI | 좁은 화면·긴 텍스트·dialog·print, 26·30 | U09·P02 |

## Supabase 앱 경계

lib/supabase/reading-store.ts의 모든 공개 함수는 아래에서 개별 검증 책임을 지정한다. 파일 전체의 책임은 Step 09–15다.

| 파일/공개 함수 | 현재 확인한 검증 | 추가 책임 / step | 시나리오 / 테스트·결과 참조 |
| --- | --- | --- | --- |
| lib/supabase/config.ts | build 실행 경로 | env 존재·로컬 로그인 flag, 16 | A01 |
| lib/supabase/client.ts | 브라우저 간접 | factory 전달 경계, 16 | A01 |
| lib/supabase/server.ts | build 실행 경로 | cookie 읽기/쓰기·예외, 16 | A01 |
| lib/supabase/middleware.ts | build | cookie·추가 헤더·getUser·미설정, 17 | A03 |
| middleware.ts | build | delegate·matcher 적용/제외 경로, 17 | A03 |
| reading-store: fetchReadingData | tests/reading-store-read.test.ts::`정상 입력: 전체 조회는 여섯 컬렉션을 snake_case row에서 owner 범위의 도메인 데이터로 매핑한다`; `경계값: 전체 조회는 모든 data null을 빈 컬렉션과 record로 반환한다`; `경계값: 전체 조회는 모든 빈 row 목록을 빈 컬렉션과 record로 반환한다`; nullable·invalid quiz/audio 경계 | 6개 컬렉션 매핑·projection·필터·오류, 09 Complete | S01 |
| reading-store: fetchReadingProfileData | tests/reading-store-read.test.ts::`정상 입력: 프로필 조회는 owner 아동을 생성일 순서의 도메인 자료로 매핑한다`; `경계값: 프로필 조회는 data null을 빈 children으로 반환한다`; `경계값: 프로필 조회는 빈 row 목록을 빈 children으로 반환한다` | 아동 매핑·projection·owner·순서·오류, 09 Complete | S01 |
| reading-store: fetchChildTodayData | tests/reading-store-child.test.ts의 object/array/null 관계, 빈 row/data null, completion·audio 복합 key 및 오류 전파 독립 테스트 | embedded 관계·scope·오류, 10 Complete | S02 |
| reading-store: fetchUpcomingAssignmentData | tests/reading-store-child.test.ts의 시작일/과거·정렬·owner-child 범위·책 dedup, 빈 row/data null 및 오류 전파 독립 테스트 | 미래 경계·책 중복 제거, 10 Complete | S02 |
| reading-store: fetchParentActivityData | tests/reading-store-parent.test.ts의 기간 양 끝·owner·공유 book ID의 정확한 후속 `in`, 빈 assignment의 수동 기록 보존/후속 조회 생략, 초기/후속 `data null`, `task_counts`/`quiz_enabled`/`content_type` 기본값, 1차·후속 DB error 및 대표 Promise rejection | 기간·book ID dedup·후속 조회·오류, 11 Complete; assignment ID dedup은 PK상 정상 DB 응답 N/A인 방어 로직 | S03 |
| reading-store: fetchBookManageData | tests/reading-store-library.test.ts의 시리즈/title/all, raw `%`/`_` `ilike`, book 매핑·data null·DB error | 검색/시리즈 필터·정렬·오류, 12 Complete | S04 |
| reading-store: fetchBookSeriesNames | tests/reading-store-library.test.ts의 RPC trim/blank/dedup/sort, data null/error null no-fallback, response error fallback, fallback error·fallback rejection·RPC rejection | RPC 결과 정리·오류 fallback, 12 Complete | S04 |
| reading-store: fetchLibraryData | tests/reading-store-library.test.ts의 owner/active/created_at·매핑, empty rows 및 Promise rejection | 활성 자료·owner·오류, 12 Complete | S04 |
| reading-store: fetchAssignedBookIds | tests/reading-store-library.test.ts의 owner 전체 이력, dedup, data null/empty ID, DB error | owner 전체 이력·ID dedup·오류, 12 Complete | S04 |
| reading-store: saveChild | tests/reading-store-material-write.test.ts의 신규 insert·기존 update·DB error | insert/update·payload·owner/id·error, 13 Complete | S05 |
| reading-store: saveBook | tests/reading-store-material-write.test.ts의 일반/단어 읽기 insert·비활성 update·null content_type row·data null | insert/update·유형·선택 문자열·active 보존·error, 13 Complete | S05 |
| reading-store: setBookActive | tests/reading-store-material-write.test.ts의 비활성화/재활성화·Promise rejection | owner/id·상태·error, 13 Complete | S05 |
| reading-store: saveAssignments | tests/reading-store-assignment-write.test.ts의 batch 전체 payload/owner/conflict key, quiz N score null·Y score key 생략, 반환 매핑, 빈 batch data null, DB error | upsert·매핑·빈 batch·오류, 14 Complete | S06 |
| reading-store: saveAssignmentQuizScore | tests/reading-store-assignment-write.test.ts의 PASS/FAIL, owner/id, exact select/single, data null·DB error·Promise rejection | 결과·scope·매핑·오류, 14 Complete | S06 |
| reading-store: saveAssignmentTaskCounts | tests/reading-store-assignment-write.test.ts의 tasks/counts/quiz payload, quiz Y score 보존·Y→N null, owner/id·반환·DB error·data null | counts·quiz 초기화·scope·오류, 14 Complete | S06 |
| reading-store: deleteAssignment | tests/reading-store-assignment-write.test.ts의 delete owner/id·undefined 성공 반환·DB error | scope·오류, 14 Complete; 0행 정책 Q03 | S06 |
| reading-store: saveManualLog | tests/reading-store-manual-log.test.ts의 전체 insert payload/owner, exact select/single·row 매핑, 빈 note/0분, data null·DB error | insert·경계·매핑·오류, 14 Complete | S06 |
| reading-store: deleteManualLog | tests/reading-store-manual-log.test.ts의 delete owner/id·id select/single·반환 ID, data null·DB error·Promise rejection | scope·반환·오류, 14 Complete; 실제 0행은 single 응답 계약에 따름 | S06 |
| reading-store: fetchCompletion | completion-store.test.ts | 기존 회귀 대응·공백, 15 | S07 |
| reading-store: saveCompletionGuarded | completion-store.test.ts | expected-count·충돌·오류 기존 회귀, 15 | S07 |
| reading-store: saveAudioLaunch | audio-return-store.test.ts | 기존 실행 저장 회귀, 15 | S08 |
| reading-store: fetchAudioLaunch | audio-return-store.test.ts | 기존 조회 회귀, 15 | S08 |
| reading-store: saveAudioReturn | audio-return-store.test.ts | 조건부 첫 복귀·이전 실행 보호, 15 | S08 |

private row mapper는 공개 함수의 입출력으로 검증한다. 테스트 편의를 위해 mapper를 모두 export하지 않는다. 모든 store API의 owner 조건 검증은 앱 요청 계약이며 실제 RLS 동작과는 다른 증거다.

## PWA·하네스·설정

| 파일 | 현재 확인한 검증 | 추가 책임 / step | 시나리오 / 테스트·결과 참조 |
| --- | --- | --- | --- |
| public/sw.js | check:sw, check:pwa | install/activate/fetch 실행 및 브라우저, 29 | P01 |
| public/manifest.webmanifest | check:pwa | 실제 응답·설치 메타·모바일, 29·30 | P01·P02 |
| public/assets/** | 일부 manifest/cache 자산 존재 검사 | 참조된 자산 응답과 표시; 이미지 자체 단위 테스트는 없음, 29·30 | P02 (참조 자산) |
| scripts/run-unit-tests.mjs | Step 02: unit 7파일·harness 8사례 PASS | 정리/컴파일/신규·중첩 발견·삭제 stale·0개·실패/컴파일 오류 검증 완료; Step 31에서 재사용 | T01 |
| scripts/smoke-audio-completion.mjs | 7개 브라우저 시나리오 | fixture·정리·실패 artifact·기존 회귀 보존, 04·25 | T01·H01·C03·U05·U06·U07 |
| scripts/check-contracts.mjs | 현재 실행 통과 | 정상/누락/위반 fixture, 31 | T01 |
| scripts/check-pwa.mjs | verify의 정적 검사 | manifest/cache 누락 fixture, 31 | T01 |
| scripts/plan-workflow.mjs | 현재 요청에서 실행 | 분류·추천·경고 fixture, 31 | T01 |
| scripts/plan-archive.mjs | 구현 파일 조사 | 임시 plan의 통과/거부/중복/입력, 31 | T01 |
| scripts/git-publish.mjs | 구현 파일 조사 | 가짜 git/임시 repo로 인자·실패·변경 없음, 31 | T01 |
| next.config.mjs | build | 실제 Next 실행과 StrictMode 수명주기, 03·04·31 | T02 |
| package.json / package-lock.json | Step 02: test:unit 단일 러너, test:harness 8 PASS; 의존성/lock 변경 없음 | 러너 경계·재현 가능한 dev 도구·실패 exit, 02–04·32 | T02 |
| tsconfig.json / tsconfig.test.json | Step 02: typecheck PASS, unit 루트/중첩 경계·다른 계층 제외/noEmitOnError 검증 | 러너 대상 분리·신규 suite typecheck, 02·03·32 | T02 |
| next-env.d.ts | typecheck | 생성된 타입 계약; 직접 테스트/수정 대상 아님 | T02 (생성 타입) |
| .gitignore | contracts의 legacy 경계 | 테스트 산출물 제외 및 하네스 fixture, 02·31 | T01·T02 |
| AGENTS.md / README.md / docs/** / plans/** | contracts 일부·문서 리뷰 | 코드 테스트 대상 아님; 명령·계약·링크 정합성, 01·32·33 | T02 (문서) |

## SQL migration의 검증 경계

전체 13개 migration 파일을 후속 실제 DB 검증 대상으로 기록한다. 기존 contracts는 초기 SQL의 RLS/policy 문자열을 일부 확인할 뿐 migration 적용·SQL 의미·권한 실행을 증명하지 않는다. 현재 필수 자동 계획의 구현 완료 기준에서 SQL 실행·RLS는 제외한다.

- 20260608213000_init.sql
- 20260610093000_assignment_task_counts.sql
- 20260610172000_assignment_activity_groups.sql
- 20260610183000_assignment_activity_category_model.sql
- 20260615210000_word_reading_extra_study.sql
- 20260617120000_book_series_names_rpc.sql
- 20260621190000_assignment_quiz_score.sql
- 20260621200000_assignment_quiz_enabled.sql
- 20260621210000_anonymous_local_test_profiles.sql
- 20260624090000_assignment_quiz_result_text.sql
- 20260624093000_assignment_quiz_only_tasks.sql
- 20260627120000_assignment_quiz_pass_fail.sql
- 20260711120000_copywork_extra_study.sql

[후속 DB/RLS 실행 조건](follow-up.md#db와-rls).

## 제외와 최종 대조

ignored 루트 legacy app.js/index.html/manifest.webmanifest/sw.js, .next/, .test-build/, node_modules/, 루트 assets/ 및 books/ 원본 사진·첨부 자료는 운영 코드 테스트 대상에서 제외한다. 운영 자산은 public/assets/ 기준으로 확인한다.

Step 01에서 최신 운영 파일/함수 목록과 이 표를 대조했다. Step 33에서 추가·삭제 파일까지 갱신한다. 전체 코드 커버리지 보고의 제외도 이 목록과 일치해야 한다.

## Step 01 대조 기준과 추적 양식

기준 HEAD: `47274cca14833395724a7bb8cf7e93a3a1150c52` (사용자 제공 main). 2026-10-13의 실제 파일 목록: app 15개, lib 15개, scripts 7개, public 9개(자산 7개 포함), migration 13개와 middleware.ts. styles.css 및 루트 설정도 위 표의 책임에 포함한다. 런타임 export 102개(함수·class·상수·default 포함)는 아래 및 store 표에 연결한다. 타입 전용 export 30개는 컴파일/도메인 계약으로 다루며 별도 런타임 테스트를 강제하지 않는다.

- .env.example: A01·T02, Step 16·32; 설정 이름과 누락 계약을 대조한다. 실제 .env.local 값은 증거에 복사하지 않는다.
- public 자산 7개: app-icon.svg, app-icon-192.png, app-icon-512.png, covers/berenstain-doctor.jpg, covers/bones.jpg, covers/monthly-filled.jpg, covers/monthly-blank.jpg. P01/P02의 참조 응답·표시 검사 대상이며 bitmap 자체 단위 테스트는 제외한다. monthly-blank.jpg가 SW precache 목록에 없다는 이유로 캐시 의무를 새로 만들지 않는다.
- tests/*.test.ts 6개와 tests/helpers/completion-supabase-fake.ts는 기존 증거/하네스다. T01(Step 02·31)에서 fixture 책임을 다루고 E01~E06로 보존한다. 테스트 파일 자체는 제품 source 커버리지 분모에서 제외한다.
- skills-lock.json 및 .agents/.codex의 skill/설정은 개발 도구 문서이며 이번 운영 앱 커버리지 분모에서 제외한다. tsconfig.tsbuildinfo 등 생성 산출물도 제외한다.

| 운영 파일/API | 시나리오 | 테스트 경로::이름 | 근거·정상/edge/invalid | 명령·결과·artifact | 제외 이유/후속 |
| --- | --- | --- | --- | --- | --- |
| 후속 step 작성 양식 | 기존 ID 유지 | scenarios.md의 제안 경로에서 실제 경로/이름으로 확정 | 담당 task 및 사례 ID | 미실행/FAIL/PASS 구분 | SQL·RLS·실기기는 follow-up.md |

## 런타임 공개 API 대조

store의 23개 함수는 위 개별 행에 대응한다. 나머지 export는 아래에서 각 이름을 추적한다. API 반환 객체의 coordinator/hook 행동도 담당 시나리오를 따른다. private mapper나 내부 helper는 공개 결과로 확인하며 export를 추가하지 않는다.

| 파일 | 공개 export | 시나리오 / 테스트 경로·증거 참조 |
| --- | --- | --- |
| app/activity-log-cell.tsx | `ActivityLogCell` | C04·D08·U08 |
| app/assignment-book-picker.tsx | `AssignmentBookPicker` | C01·D06 |
| app/assignment-edit-form.tsx | `AssignmentEditForm` | C01·D06 |
| app/assignment-quiz-score.tsx | `AssignmentQuizScore` | C02 |
| app/auth/callback/route.ts | `GET` | A02 |
| app/auth/error/page.tsx | `AuthErrorPage` | A03 |
| app/auth-panel.tsx | `AuthPanel` | A04 |
| app/layout.tsx | `metadata`, `viewport`, `RootLayout` | P02 |
| app/material-thumb.tsx | `MaterialThumb`, `formatMaterialMeta` | C04 |
| app/page.tsx | `dynamic`, `Page` | A03 |
| app/reading-manager-client.tsx | `HomePage` | U01·U02·U03·U04·U05·U06·U07·U08·U09·M03·P02 |
| app/signed-in-shell.tsx | `SignedInShell` | A04 |
| app/task-completion-feedback.tsx | `TaskCompletionFeedback` | C03 |
| app/use-child-assignment-selection.ts | `useChildAssignmentSelection` | H01·H03 |
| app/use-child-task-requests.ts | `useChildTaskRequests` | H02·H03·U07 |
| lib/audio-return.ts | `createAudioReturnCoordinator` | S08·H03·U06 |
| lib/child-task-policy.ts | `childSelectionStorageKey`, `resolveChildSelection`, `getTaskCompletionPolicy`, `mergeAudioLaunchSnapshot`, `mergeCompletionSnapshot` | D07·H01·H03·U06 |
| lib/cover-image.ts | `compressCoverImage` | M01 |
| lib/qr-reader.ts | `readQrValueFromSource` | M02 |
| lib/reading-calculations.ts | `taskOrder`, `activityCategoryOrder`, `bookContentTypeLabels`, `formatDate`, `formatTime`, `datesInRange`, `normalizeText`, `getAssignmentBookCandidates`, `getUpcomingAssignments`, `buildAssignmentActivityLogs`, `hasCustomCover`, `isWordReadingMaterial`, `getBookSetupIssues`, `getAvailableActivityCategories`, `getDefaultTasksForMaterial`, `getActivityTasksForMaterial`, `getTaskAudioUrl`, `isValidExternalUrl`, `getAssignmentTaskCount`, `getEditableTasksForAssignment`, `buildAssignmentTaskCounts`, `getCompletionCount`, `formatTaskSummary`, `sortTasks`, `getLaunchMinutes`, `countAssignmentProgress`, `formatAssignmentTaskLabels` | D01·D03·D04·D05·D06·D07·D08·U06 |
| lib/reading-data.ts | `emptyReadingData`, `taskDefinitions`, `activityCategoryDefinitions`, `logLabels`, `taskCountOptions`, `quizResultOptions`, `dateKey` | D01·D02(06 2026-10-14 PASS)·D06·D07·U05 |
| lib/reading-drafts.ts | `emptyBookDraft`, `emptyChildDraft`, `bookToDraft`, `childToDraft` | D02(06 2026-10-14 PASS) |
| lib/reading-period.ts | `getPeriodDateRange`, `shiftSelectedDateKey`, `formatPeriodRangeLabel` | D01 |
| lib/supabase/client.ts | `createClient` | A01 |
| lib/supabase/config.ts | `getSupabaseEnv`, `isSupabaseConfigured`, `isLocalTestLoginEnabled` | A01 |
| lib/supabase/middleware.ts | `updateSession` | A03 |
| lib/supabase/server.ts | `createClient` | A01 |
| lib/task-completion.ts | `CompletionSaveError`, `buildCompletionAttempt`, `createCompletionCoordinator` | S07·H03·U07 |
| middleware.ts | `middleware`, `config` | A03 |

타입 전용 export: lib/reading-types.ts 전체, reading-calculations의 BookSetupInput, reading-period의 Period, reading-drafts의 BookDraft/ChildDraft, child-task-policy의 ChildDataStatus, task-completion의 payload/attempt/result/input/state 관련 타입, audio-return의 SavedAudioLaunch/AudioReturnPayload/AudioReturnState/AudioReturnEvent. 같은 파일의 시나리오 입력·출력과 typecheck에서 확인한다.

## Step 02 단위 러너/fixture 증거

- scripts/run-unit-tests.mjs와 tsconfig.test.json: tests/harness/unit-runner.test.mjs의 T01-N01/E01/E02/E03/E05/E06/F01/F02, root 실행 8 PASS. `.test-build`는 매 단위 명령 시작에 정리한다. 컴파일 실패 시 테스트 실행 없이 nonzero이며 부분 emit도 하지 않는다. 발견은 `.test-build/tests/`에 한정한다.
- tests/helpers/async-fixtures.ts: deferred, fixedClock. tests/helpers/reading-fixture.ts: readingFixture. tests/unit/test-fixtures.test.ts의 T01-N02/N03/E04/F03이 저장 지연/거부와 중첩 데이터·시계·query 대역 독립성을 실제 도메인 API로 확인했다(4 PASS). 고정 시계는 API에 전달할 timestamp만 제공하며 global Date/timer를 바꾸지 않는다.
- tests/helpers/completion-supabase-fake.ts: query 대역 동작은 유지하고 deferred만 분리했다. completion-store/task-completion/audio-return의 import 경로만 갱신했다. 기존 루트 6파일의 test 본문과 7개 오디오 browser 시나리오는 보존한다.
- unit은 루트 tests/*.test.ts + tests/unit/**/*.test.ts + tests/helpers/**/*.ts, 하네스는 npm run test:harness의 tests/harness/*.test.mjs다. 새 component/hook/server/browser 소스는 unit include에 넣지 않는다. 타입 import로 필요한 의존성이 포함되는 TypeScript 특성까지 완전한 모듈 격리로 주장하지 않는다.
- 실제 unit 단독 실행: 기존 6파일 106개 + 신규 4개 = 110개 test PASS. Step 01의 93개는 소스의 top-level test 선언 수였으며 parameterized 등록 후 실행 개수와 다르다.
- 전체 source 범위·unit 미import 7개를 포함한 baseline은 [review.md](review.md)의 Step 02 Coverage Baseline에서 추적한다. 이번 신규 helper/test는 제품 source 커버리지에서 제외하고 runtime 앱 파일을 제외해 수치를 올리지 않는다.

## Step 03 환경별 하네스 증거

- vitest.component.config.ts와 tests/support/component-setup.ts: tests/components/assignment-quiz-score.test.tsx의 C02-N01/T01-E07, auth-panel.test.tsx의 A04-N01, tests/hooks/lifecycle-harness.test.tsx의 T01-E08/E09/E10에서 실제 클릭·rerender·unmount·StrictMode 및 DOM/storage/env/spy/timer/listener 정리 확인(6 test PASS). 수명주기 hook은 test-only probe이며 제품 hook H02 완료로 계산하지 않는다.
- vitest.server.config.ts와 tests/support/common-setup.ts: tests/server/auth-callback.test.ts의 A02-N01/E01은 실제 GET·NextRequest/NextResponse와 lib/supabase/server.ts를 사용하고 next/headers·SDK factory만 대체한다(2 PASS). A01/A02의 전체 공백은 Step 16–17에 유지한다.
- tests/harness/component-server-runner.test.mjs의 T01-F04/F05는 실제 CLI test 발견과 잡아낸 예상 밖 fetch/잘못된 DOM 환경의 nonzero 전달을 검사한다(2 PASS). 임시 파일은 TMPDIR 아래 생성 후 t.after 제거, subprocess NODE_TEST_CONTEXT 제외. tsconfig.json은 생성 verification-artifacts만 제외하며 신규 테스트·설정의 typecheck는 PASS다.
- package.json의 test:component/test:server와 exact dev 도구·lock 변경은 이번 Step 03 범위다. 기존 unit의 include/컴파일/실행기와 6파일 본문은 유지한다. 제품 source coverage 수치는 추가 측정하지 않았으며 Step 02 baseline의 미import 공백은 그대로 추적한다.

## Step 04 브라우저 하네스 증거

- scripts/smoke-audio-completion.mjs는 기존 명령을 Playwright client-http 프로젝트로 연결한다. tests/browser/client/audio-completion.spec.mjs의 기존 7개 이름/행동/assertion이 독립 실행 7 PASS다(E07·H01/C03/U05/U06/U07). tests/browser/support/client-fixture.mjs는 실제 ReadingManagerClient bundle과 SDK HTTP를 대체하며 실제 Next SSR 검사가 아니다.
- playwright.config.ts의 next-auth-http와 tests/browser/next/auth-feasibility.spec.mjs(T01-N05/N06·A03 일부)는 독립 실행 2 PASS다. tests/browser/support/next-server.mjs·next-fixture.mjs가 실제 middleware/Page/NextRequest HTTP와 로컬 Auth HTTP를 연결한다. root app/lib/middleware/next.config 제품 소스는 변경하지 않고 .env.local 없는 복사본에서 실행한다.
- tests/harness/browser-runner.test.mjs(T01-N07/F06/F07)는 신규 발견·미등록 요청 nonzero/trace/화면/요청 artifact·실제 Next 시작 실패/정리를 검사한다. network.mjs·next-network-guard.cjs는 브라우저 loopback과 Next SDK fetch 경계를 고정한다. 최초·2차 harness의 T01-F06 요청 JSON 누락은 별도 파일 저장으로 보완했고 단독 1 PASS 및 최종 harness 13 PASS다.
- package.json/lock은 repo exact dev 도구를 고정하며 별도 직접 playwright 설치는 없다. docs/development-harness.md·testing-guidelines.md에 명령/계층/artifact 경계를 승격했다. source coverage 재측정이나 임의 gate는 없고 Step 02 미import baseline을 유지한다.
