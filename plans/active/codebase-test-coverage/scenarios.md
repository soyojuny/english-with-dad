# 핵심 시나리오와 기대 동작

## 적용 방식

아래 43개 ID는 필수 자동 시나리오 묶음이다. 하나의 ID가 테스트 하나를 뜻하지 않는다. Step 01에서 코드/공개 API, 기대 동작, 기존 증거와 작성할 테스트 경로를 연결했다. **계약 목록 확정·Step 02 단위 기반·Step 03 환경별 호환성 검증은 완료했고 다른 신규 런타임 검증은 대기**다. 각 담당 step에서 사례를 `<ID>-N01/E01/F01`로 나누고 테스트명·실행 결과를 기록한다. 기존 회귀 일부가 있다는 이유로 묶음 전체를 PASS 처리하지 않는다.

기대 결과가 계약/문서로 확인되지 않은 invalid 입력은 현재 출력값을 복사하지 않고 확인 필요 또는 결함으로 기록한다. 이미 있는 테스트는 대응시키고 미검증 사례만 추가한다. query 대역/HTTP fixture는 실제 DB·RLS 증거가 아니다.

| ID | 계약 | 기대 동작 / 확인 지점 | 담당 step | 계층 | 운영 파일 | 테스트 경로 (후속 제안 포함) | 기존 증거 / 현재 결과 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D01 | 날짜·기간 | 일요일 시작 주간·윤년/월말·포함 범위·주/월 이동 | 05 | unit | lib/reading-data.ts; lib/reading-calculations.ts; lib/reading-period.ts | tests/reading-calculations.test.ts; tests/reading-period.test.ts | E01 일부; 신규 대기 |
| D02 | 초안·데이터 정의 | null 기본값·자료 필드 보존·audio 참조 분리·초기 컬렉션/정의/옵션 | 06 | unit | lib/reading-drafts.ts; lib/reading-data.ts | tests/reading-drafts.test.ts | 없음; 신규 대기 |
| D03 | 자료 준비 | 일반 책/단어 읽기의 표지·필수 링크 차이 | 07·23 | unit/browser | lib/reading-calculations.ts; app/reading-manager-client.tsx | tests/reading-calculations.test.ts; tests/browser/profile-material.spec.ts | E01 일부; 신규 대기 |
| D04 | URL 경계 | 빈 값 허용과 필수 입력 구분; http/https만 유효 | 07·23 | unit/browser | lib/reading-calculations.ts; app/reading-manager-client.tsx | tests/reading-calculations.test.ts; tests/browser/profile-material.spec.ts | E01 일부; 신규 대기 |
| D05 | 후보 검색·예정 목록 | 선택 자료 제외·이력 조건·시리즈·정렬·10/20 상한; 예정 목록은 child 일치·오늘 포함·날짜순 | 07 | unit | lib/reading-calculations.ts | tests/reading-calculations.test.ts | E01 일부; 신규 대기 |
| D06 | 자료×활동×task | 일반 책 필사/그림책·단어 읽기 기타학습 규칙 | 07·19·24 | unit/component/browser | lib/reading-calculations.ts; lib/reading-data.ts; app/assignment-book-picker.tsx; app/assignment-edit-form.tsx | tests/reading-calculations.test.ts; tests/components/assignment-book-picker.test.tsx; tests/components/assignment-edit-form.test.tsx; tests/browser/assignment-flow.spec.ts | E01 일부; 신규 대기 |
| D07 | 횟수·진행률 | legacy fallback·목표 상한·0 task·퀴즈 결과 포함 | 08 | unit | lib/reading-calculations.ts; lib/reading-data.ts; lib/child-task-policy.ts | tests/reading-calculations.test.ts; tests/child-task-policy.test.ts | E01·E02 일부; 신규 대기 |
| D08 | 활동 로그 | 자료 누락·복합 key·정렬·필사/퀴즈 보고 위치 | 08·20·26 | unit/component/browser | lib/reading-calculations.ts; app/activity-log-cell.tsx | tests/reading-calculations.test.ts; tests/components/activity-log-cell.test.tsx; tests/browser/parent-report.spec.ts | E01 일부; 신규 대기 |
| S01 | 전체·프로필 조회 | row 매핑·빈 데이터·owner 조건·각 오류 전파 | 09 | unit query 대역 | lib/supabase/reading-store.ts | tests/reading-store-read.test.ts | 없음; 신규 대기 |
| S02 | 오늘·미래 조회 | child/date/owner 조건·embedded 형태·미래 자료 dedup | 10 | unit query 대역 | lib/supabase/reading-store.ts | tests/reading-store-child.test.ts | E07 초기 조회 간접; 신규 대기 |
| S03 | 활동 기간 조회 | 기간 양 끝·후속 in 목록·0건 조회 생략·오류 | 11 | unit query 대역 | lib/supabase/reading-store.ts | tests/reading-store-parent.test.ts | 없음; 신규 대기 |
| S04 | 자료/시리즈/이력 조회 | manage는 활성/비활성 검색·library는 active만·RPC 정리/fallback·owner 전체 이력 dedup | 12 | unit query 대역 | lib/supabase/reading-store.ts | tests/reading-store-library.test.ts | 없음; 신규 대기 |
| S05 | 아동/책 mutation | insert/update·소유자 범위·선택 필드 문자열·active 보존 | 13 | unit query 대역 | lib/supabase/reading-store.ts | tests/reading-store-material-write.test.ts | 없음; 신규 대기 |
| S06 | 배정/수동 기록 mutation | batch conflict key·quiz Y→N 결과 초기화·삭제 오류 | 14 | unit query 대역 | lib/supabase/reading-store.ts | tests/reading-store-assignment-write.test.ts; tests/reading-store-manual-log.test.ts | 없음; 신규 대기 |
| S07 | 완료 경쟁 | expected-count·unique 충돌 대역·횟수 퇴행 방지 | 15 | unit query 대역 | lib/supabase/reading-store.ts; lib/task-completion.ts | tests/completion-store.test.ts; tests/task-completion.test.ts | E03·E05 일부; 신규 대기 |
| S08 | 복귀 경쟁 | 기존 openedAt와 미복귀 조건·첫 복귀 시각·이전 실행 보호 | 15 | unit query 대역 | lib/supabase/reading-store.ts; lib/audio-return.ts | tests/audio-return-store.test.ts; tests/audio-return.test.ts | E04·E06 일부; 신규 대기 |
| A01 | env·client | 설정 일부 누락·로컬 flag·cookie 읽기/쓰기 | 16 | server 대역 | lib/supabase/config.ts; lib/supabase/client.ts; lib/supabase/server.ts | tests/server/supabase-config.test.ts; tests/server/supabase-clients.test.ts | E08 정적만; 신규 대기 |
| A02 | callback | code 성공/실패/없음·redirect 계약·private no-store | 17 | server/Next browser | app/auth/callback/route.ts | tests/server/auth-callback.test.ts; tests/browser/auth-routes.spec.ts | E08 정적만; 신규 대기 |
| A03 | middleware·Page | 추가 cookie/header·matcher 제외·설정/로그인 분기 | 17 | server/Next browser | lib/supabase/middleware.ts; middleware.ts; app/page.tsx; app/auth/error/page.tsx | tests/server/auth-middleware.test.ts; tests/browser/auth-routes.spec.ts | E08 정적만; 신규 대기 |
| A04 | 인증 UI | OAuth 요청·localhost 조건·Anonymous 거부·logout 오류 | 18 | component | app/auth-panel.tsx; app/signed-in-shell.tsx | tests/components/auth-panel.test.tsx; tests/components/signed-in-shell.test.tsx | 없음; 신규 대기 |
| C01 | 배정 picker/form | 자료 제거/재추가·category reset·폼 값·cancel/submit | 19 | component | app/assignment-book-picker.tsx; app/assignment-edit-form.tsx | tests/components/assignment-book-picker.test.tsx; tests/components/assignment-edit-form.test.tsx | 없음; 신규 대기 |
| C02 | 퀴즈 UI | PASS/FAIL 저장 callback과 선택 표시 | 19·25 | component/browser | app/assignment-quiz-score.tsx | tests/components/assignment-quiz-score.test.tsx; tests/browser/child-completion.spec.ts | 없음; 신규 대기 |
| C03 | 완료 안내 | loading/error/pending/checking/uncertain/conflict/목표 완료 | 20 | component | app/task-completion-feedback.tsx | tests/components/task-completion-feedback.test.tsx | E07 일부 간접; 신규 대기 |
| C04 | 활동 셀/표지 | 합계·그룹·수동 삭제 허용·단어 대체 표시·alt | 20 | component | app/activity-log-cell.tsx; app/material-thumb.tsx | tests/components/activity-log-cell.test.tsx; tests/components/material-thumb.test.tsx | 없음; 신규 대기 |
| H01 | 선택 복원 | loading 중 보존·ready 복원·scope 전환·storage 예외 | 21 | hook | app/use-child-assignment-selection.ts; lib/child-task-policy.ts | tests/hooks/use-child-assignment-selection.test.tsx | E02·E07 일부; 신규 대기 |
| H02 | 요청 hook | 15초 경계·listeners/timers cleanup·StrictMode | 22 | hook | app/use-child-task-requests.ts | tests/hooks/use-child-task-requests.test.tsx | E07 지연 복구 일부; 신규 대기 |
| H03 | scope 변경 | 다른 프로필/owner/assignment와 unmount 후 늦은 응답 배제 | 21·22·25 | unit/hook/browser | app/use-child-assignment-selection.ts; app/use-child-task-requests.ts; lib/task-completion.ts; lib/audio-return.ts; lib/child-task-policy.ts | tests/child-task-policy.test.ts; tests/task-completion.test.ts; tests/audio-return.test.ts; tests/hooks/use-child-assignment-selection.test.tsx; tests/hooks/use-child-task-requests.test.tsx; tests/browser/child-completion.spec.ts | E02·E03·E04 일부; 신규 대기 |
| U01 | 자료 관리 | 아동/자료 생성·편집·검색·비활성/복원·저장 실패 | 23 | client browser | app/reading-manager-client.tsx | tests/browser/profile-material.spec.ts | 없음; 신규 대기 |
| U02 | 배정 생성 | 날짜×자료 payload·동일 키 갱신·생성 수·퀴즈 기본 N | 24 | client browser | app/reading-manager-client.tsx | tests/browser/assignment-flow.spec.ts | 없음; 신규 대기 |
| U03 | 배정 invalid | 역전 날짜·아동 없음·활동 미선택·0회 퀴즈 N 거부 | 24 | client browser | app/reading-manager-client.tsx | tests/browser/assignment-flow.spec.ts | 없음; 신규 대기 |
| U04 | 배정 편집/삭제 | 목록 병합·quiz off·실패 시 성공 상태를 만들지 않음 | 24 | client browser | app/reading-manager-client.tsx | tests/browser/assignment-flow.spec.ts | 없음; 신규 대기 |
| U05 | 5개 task | 읽기/정따/스스로/단어 읽기/필사의 저장·목표·기본시간 | 25 | client browser | app/reading-manager-client.tsx; lib/reading-data.ts | tests/browser/child-completion.spec.ts | E07 읽기 일부; 신규 대기 |
| U06 | 외부 링크·복귀 | 열기/복귀는 자동 완료 아님·복귀 지연 시간·popup 실패 | 25 | client browser | app/reading-manager-client.tsx; lib/audio-return.ts; lib/child-task-policy.ts | tests/browser/child-completion.spec.ts; tests/audio-return.test.ts; tests/child-task-policy.test.ts | E02·E04·E07 일부; 신규 대기 |
| U07 | 완료 복구 | 연타·저장 실패·응답 유실·확인 지연·동일 요청 재시도 | 15·22·25 | unit/hook/browser | app/reading-manager-client.tsx; lib/task-completion.ts; app/use-child-task-requests.ts | tests/task-completion.test.ts; tests/completion-store.test.ts; tests/hooks/use-child-task-requests.test.tsx; tests/browser/child-completion.spec.ts | E03·E05·E07 일부; 신규 대기 |
| U08 | 부모 기록 | 주간 기본·월간/아동 전환·분류·합계·진행률·퀴즈 | 26 | client browser | app/reading-manager-client.tsx; app/activity-log-cell.tsx | tests/browser/parent-report.spec.ts | E01 계산 일부; 신규 대기 |
| U09 | 수동 기록·출력 | 추가/삭제 오류·print 준비/호출·기간 데이터 일치 | 26 | client browser | app/reading-manager-client.tsx; styles.css | tests/browser/parent-report.spec.ts | 없음; 신규 대기 |
| M01 | 표지 | 960px 상한·확대 없음·JPEG 흰 배경·load/context 오류·URL 해제 | 27 | DOM 경계/browser | lib/cover-image.ts | tests/components/cover-image.test.ts; tests/browser/qr-image.spec.ts | 없음; 신규 대기 |
| M02 | QR 판독 | 합성 QR의 실제 decode·반전·공백·없는 QR·0크기 | 27 | DOM 경계/browser | lib/qr-reader.ts | tests/components/qr-reader.test.ts; tests/browser/qr-image.spec.ts | 없음; 신규 대기 |
| M03 | 카메라/업로드 | 필드 적용·권한/미지원·late stream·track/interval 정리 | 28 | browser API 대역 | app/reading-manager-client.tsx | tests/browser/camera-upload.spec.ts | 없음; 신규 대기 |
| P01 | SW 실행 | install/activate·cache cleanup·GET/nonGET·offline fallback | 29 | worker 대역/Next browser | public/sw.js; public/manifest.webmanifest | tests/harness/service-worker.test.mjs; tests/browser/pwa.spec.ts | E08 정적만; 신규 대기 |
| P02 | 모바일 표시 | 360/390px·긴 한국어·버튼·dialog·의도된 표 스크롤 | 30 | browser | app/layout.tsx; styles.css; public/manifest.webmanifest; public/assets/** | tests/browser/mobile-layout.spec.ts | E07 모바일 실행 일부·E08 정적; 신규 대기 |
| T01 | 러너/하네스 | 새 파일 발견·삭제 산출물·0개/실패 exit·임시 fixture | 02·03·31 | harness/component/hook | scripts/run-unit-tests.mjs; scripts/check-contracts.mjs; scripts/check-pwa.mjs; scripts/plan-workflow.mjs; scripts/plan-archive.mjs; scripts/git-publish.mjs; scripts/smoke-audio-completion.mjs; tests/helpers/completion-supabase-fake.ts; tests/helpers/async-fixtures.ts; tests/helpers/reading-fixture.ts; vitest.component.config.ts; vitest.server.config.ts; tests/support/ | tests/harness/unit-runner.test.mjs; tests/unit/test-fixtures.test.ts; tests/harness/component-server-runner.test.mjs; tests/hooks/lifecycle-harness.test.tsx; tests/components/assignment-quiz-score.test.tsx | Step 02: harness 8·fixture 4 PASS; Step 03 실행 기록 아래; Step 31 다른 도구 대기 |
| T02 | 전체 검증 | 필수 suite 탐색·독립/전체 실행·coverage 공백·로그 인계 | 32·33 | 전체 자동 | package.json; package-lock.json; tsconfig.json; tsconfig.test.json; next.config.mjs; .gitignore; next-env.d.ts; AGENTS.md; README.md; docs/**; plans/**; .env.example | review.md; inventory.md; scenarios.md; 후속 coverage report 경로 확정 | Step 02 source baseline 기록; 전체 gate/coverage는 Step 32–33 대기 |

## 우선순위와 실패 처리

1. 소유자/프로필 scope 격리, 완료 횟수·이전 응답 보호, 인증 redirect·cookie, 실패/불확실 상태를 최우선으로 검증한다.
2. 자료별 과제·퀴즈 규칙, 날짜·배정 생성, 부모 활동 합계·분류를 다음 우선순위로 검증한다.
3. 미디어 자원 정리, 모바일 표시, PWA fallback과 개발 도구 실패 경로를 끝까지 연결한다.

모든 목록은 필수 자동 범위다. 우선순위가 낮다는 이유로 누락하지 않는다. 구현 중 현재 요구사항 밖 사례가 드러나면 이유를 기록하고 계획을 갱신한다.

## 계층별 증거와 제외

- SDK query 대역은 앱이 선택한 table/payload/filter 및 오류 처리를 확인한다. DB가 해당 요청을 실제 허용·거부하는지는 확인하지 않는다.
- HTTP fixture UI 검사는 실제 React UI와 SDK 요청 연결을 확인한다. SQL constraints·RLS·실제 Auth 세션 유효성을 확인하지 않는다.
- 로컬 Next 서버 + HTTP Auth 대역은 framework route·cookie·SSR 분기를 확인한다. Google 및 Supabase 서버 실연동 성공의 증거는 아니다.
- simulated camera/event와 실제 Android 외부 앱 전환은 다른 검증이다.
- SQL/RLS와 실제 기기 항목은 [follow-up.md](follow-up.md)에서 확인한다.

## 구현 시 확장할 기록

각 담당 step은 다음 양식으로 실제 발견/실행된 사례를 기록한다. 제안 경로는 실제 생성 전까지 존재하는 테스트로 계산하지 않는다.

| 사례 ID | Given 입력/상태 | When 공개 행동 | Then 고정 기대값·근거 | 테스트 파일::테스트명 | 분류 | 명령·결과·artifact |
| --- | --- | --- | --- | --- | --- | --- |
| D01-E01 (작성 대상) | 2024-02-29 | month 범위 조회 | 02-01~02-29; Step 05 계약 | tests/reading-period.test.ts::미작성 | edge | 대기 |

새 기능 규칙을 임의로 만들지 않는다. 최종 review는 이 표와 실제 발견/실행된 테스트를 대조한다.

## 정상·경계·invalid 적용 계약

근거는 각 담당 task의 Cases to Verify, docs/CONTEXT.md의 도메인 용어, docs/testing-guidelines.md 및 아래 기존 회귀다. 코드 대조는 API/경계 확인이며 불명확한 입력의 요구사항을 대신하지 않는다. 실패는 외부 통신/API 오류도 포함한다. 타입 밖 값을 억지로 생성하는 invalid는 N/A 이유를 남긴다.

| ID | 정상 | 경계 | invalid/실패 또는 N/A 이유 |
| --- | --- | --- | --- |
| D01 | 고정 날짜의 주/월 범위·표시 | 일요일·월말·윤년·연말·포함 양 끝 | 역전 범위는 []; malformed 날짜 정책은 Q01 |
| D02 | book/child의 모든 편집 필드 복사·초기 컬렉션/label/task 정의/옵션 | null 초안·audio 참조 분리 | 타입 밖 객체 N/A: 폼 검증은 U01 |
| D03 | 일반 책은 표지/읽기/정따 준비 상태 표시 | 단어 읽기는 listen만 필요·기본 아이콘 | 누락 링크는 준비 부족 표시; 저장 거부와 구분 |
| D04 | http/https URL 허용 | 공백은 helper에서 true; 단어 읽기 저장에는 필수 | ftp/javascript/깨진 URL은 false·폼 저장 차단 |
| D05 | 시리즈/검색 및 선택 제외·예정 목록 child/date 필터 | 무검색 10개·검색 20개; 검색할 때 이력 포함·오늘 포함 | 문자열 검색은 정규화; SQL wildcard는 Q02 |
| D06 | 일반 책 기타학습=copywork, 단어=wordRead | 그림책 listen 1회·empty tasks fallback | 타입 밖 category N/A; UI 허용 선택만 검증 |
| D07 | 목표 3/완료 1의 횟수·비율 | 목표 상한·legacy 1/0·퀴즈 전용 PASS/FAIL=100% | 불가능한 task 강제 N/A; 저장 count 오류는 S07 |
| D08 | 완료/퀴즈를 assignment:task key로 연결 | 책 누락은 로그 생략·퀴즈 0분/1건·필사 기타학습 | 타입 밖 log type N/A; 외부 row는 S01 |
| S01 | 6개 컬렉션/프로필 매핑과 owner 필터 | data null=[]; content_type null=book; quiz invalid=null | 각 query 오류 reject; raw row 허용 범위만 |
| S02 | 오늘 child/date eq, 미래 gte | embedded book 객체/배열/null; 미래 books dedup | query 오류 reject; 오늘 books dedup은 요구하지 않음 |
| S03 | 기간 gte/lte·child/owner 및 후속 in | 빈 assignment의 books/completion/launch 조회 생략 | 첫/후속 query 오류 reject |
| S04 | manage 검색·active library·owner 전체 배정 이력 | RPC trim/dedup/sort·실패 fallback; all 필터 | fallback 실패 reject; 검색 특수문자 정책 Q02 |
| S05 | insert/update의 payload·owner/id | 빈 선택 문자열 그대로; 비활성 자료 보존 | error 또는 single data null은 reject |
| S06 | batch conflict key·퀴즈/수동 mutation | quiz N은 score null; 삭제 0행 정책 Q03 | query 오류 reject·실패 UI 성공 반영 금지 |
| S07 | 최초 insert·이후 expected-count update | unique 충돌 재조회·더 최신 count 보호 | 잘못된 count 전이는 write 없음; 전송 불명은 uncertain |
| S08 | launch upsert·조건부 첫 return update | 같은 openedAt + returned_at null; 이전 실행 불변 | 오류 reject와 0행 conflict 구분 |
| A01 | URL/key를 SDK factory에 전달·cookies getAll/setAll | 설정 일부 누락·Server Component cookie write 제한 | env 누락은 명시 오류; flag는 dev이며 false가 아닐 때 |
| A02 | code 성공이면 같은 origin의 next pathname | next 미지정=/; code 없음/교환 오류=/auth/error | 외부 next는 /; code/next 제거·private no-store; Q04 |
| A03 | cookie/header 전달·user 유무 페이지 분기 | 미설정 setup·정적 경로 matcher 제외 | Auth 실패 세부 정책 Q04; 타인 세션을 fixture로 성공 처리 금지 |
| A04 | Google provider/redirect·logout refresh | dev 버튼·localhost 실행 제한·제출 disabled | OAuth/logout 오류 표시·Anonymous disabled 안내 |
| C01 | 자료 선택·제거/재추가·제출/cancel | rerender·활동 변경 reset·0 task fallback | 허용 밖 폼 강제 N/A; 실제 거부는 U03 |
| C02 | PASS/FAIL callback 및 선택 상태 | quiz 전용 task 없음·결과 null | 타입 밖 quiz 결과 강제 N/A; row 변환 S01 |
| C03 | 상태 안내·role·callback | 목표 완료와 conflict·uncertain 표시 | error 상태에서 성공 안내 금지 |
| C04 | group 합계·수동 delete·cover/alt/meta | 빈 로그·단어 대체 표시·누락 volume/level | 자동 로그 삭제 불가; 이미지 load 실패 정책 Q05 |
| H01 | ready에서 저장된 유효 선택 복원 | loading 동안 보존·owner/child/date 변경 | storage 예외 안전 처리·삭제/타 scope 선택 fallback |
| H02 | pending/checking 15초에 uncertain | 14,999/15,000/15,001ms·StrictMode cleanup | 오래된 timer/listener가 완료를 재실행하지 않음 |
| H03 | 현재 scope 응답만 반영 | 프로필/owner/assignment 전환·unmount | late save/fetch가 새 scope 상태를 덮어쓰지 않음 |
| U01 | 아동/자료 생성 편집·검색·비활성 복원 | 빈 초기 목록·단어 자료·비활성 편집 | 빈 필수 필드/invalid URL 거부·저장 오류 성공 반영 없음 |
| U02 | 날짜×자료 payload와 새 배정 수 | 같은 날·기존 key 갱신·quiz 기본 N·퀴즈 전용 | 요청 오류 성공 수 표시 금지 |
| U03 | 유효 입력은 배정 가능 | 0 task+quiz Y 허용; 0 task+N 거부 | 역전 날짜·아동 없음·활동 전부 미선택은 write 없음 |
| U04 | 편집 병합/삭제·quiz N 결과 초기화 | 빈 task+quiz Y·기존 배정 | 저장/삭제 실패 시 목록 유지·성공 표시 금지 |
| U05 | 5 task의 수동 완료·count 증가 | 기본 분 listen/shadow=10, self/wordRead/copywork=5·상한 | audio task는 launch 필요; self/copywork는 불필요 |
| U06 | departure 후 첫 복귀만 기록 | 1ms=1분·60,000ms=1분·60,001ms=2분; 저장 지연 | popup 실패·invalid/역전 시각 fallback; 자동 완료 없음 |
| U07 | 저장 중 연타 차단·동일 요청 재시도 | 응답 유실 재조회·결과 조회 지연·늦은 성공 | 실패/uncertain은 결과 확인 전 새 count 쓰기 금지 |
| U08 | 주간 기본·월간/아동 이동·합계/진행률 | 필사/단어 기타학습·PASS/FAIL 퀴즈·빈 기간 | 범위 조회 오류는 성공한 빈 보고서로 숨기지 않음 |
| U09 | 수동 추가/삭제·준비 후 print 호출 | 기간 전환·데이터 준비 및 print timer cleanup | 저장/삭제 오류·조회 실패 시 잘못된 출력 금지 |
| M01 | 비율 유지·JPEG quality .72·흰 배경 | 최대 960px·작은 이미지 확대 없음·최소 1px | 비이미지/load/context 오류; object URL 해제 |
| M02 | 실제 jsQR가 합성 QR 원문 판독 | 반전·trim·0크기=null | QR 없음/context 없음=null; URL 유효성은 D04 |
| M03 | QR 값을 지정 필드 적용·이미지 업로드 | late stream·닫기/unmount track/interval 정리 | 카메라 미지원/권한 거부·invalid URL 안내 |
| P01 | install precache·activate 이전 cache 삭제 | GET navigation은 network; 실패 시 / fallback | nonGET 관여 없음·비navigation cache miss fetch; 실제 offline 쓰기 제외 |
| P02 | 360/390px 화면·버튼/dialog 조작 | 긴 한국어·의도된 표 가로 스크롤·print CSS | 데이터 없음/오류 안내에서도 조작 가능; 실제 기기 제외 |
| T01 | 신규 emitted test 발견·도구 정상 fixture | 0개·삭제된 source/stale output·임시 repo 정리 | child failure는 nonzero; 미지원 연산/호출 실패 |
| T02 | 각 필수 suite 단독/전체 발견과 실행 | 미import source·제외·coverage baseline/공백 | FAIL/skip/todo를 PASS로 계산 금지 |

## 확정한 규칙과 근거

- 날짜는 로컬 dateKey다. 주간은 일~토 포함, 월 이동은 목적 월 1일이다 (Step 05, E01). UTC ISO의 날짜를 그대로 기대값으로 쓰지 않는다.
- 자료 준비 안내와 저장 필수 조건은 다르다. 일반 책의 표지/읽기/정따 누락은 준비 안내이며 모든 누락을 저장 거부로 만들지 않는다. 단어 읽기는 listen 필수, 표지 불필요다 (Step 07·23, docs/supabase-setup.md, E01).
- 필사는 일반 책의 오디오 없는 task로 기타학습에 보고한다. 단어 자료는 wordRead이며 copywork를 배정하지 않는다. 그림책은 listen 1회다 (docs/CONTEXT.md, Step 07·24, E01).
- task 없는 quiz Y 배정은 유효하다. PASS와 FAIL 모두 퀴즈 결과 기록으로 진행률에 1건을 더하고, quiz N 변경은 score를 비운다 (Step 08·14·24·25, E01).
- 링크 열기/복귀/수동 완료는 별개 사건이다. 오디오 task는 launch가 필요하지만 returnedAt은 완료 필수 조건이 아니다. fallback은 읽기/정따 10분, 스스로/단어/필사 5분이다 (Step 25, E02·E03).
- fetchAssignedBookIds의 scope는 owner 전체이며 child 인자가 없다. 오늘 조회의 books는 embedded row별 결과이고 미래 조회만 dedup을 요구한다. 선택 문자열을 saveBook에서 null로 변환한다고 가정하지 않는다 (공개 API 대조, Step 10·12·13).

## 기존 증거 장부

Step 01은 아래 파일과 테스트명을 정적으로 대조했다. E01~E06의 계획 작성 시 통과 기록과 선언 수는 과거 baseline이다. Step 02에서 기존 6파일을 직접 재실행해 106개 test PASS를 확인했다(총 assertion 개수는 아님). 각 시나리오의 남은 공백까지 PASS를 증명한 결과는 아니다. E07은 정의만 확인했으며 이번 실행 artifact는 없다.

| 증거 | 실제 경로 | 대표 테스트명 / 보존 대상 | 실행 상태와 한계 |
| --- | --- | --- | --- |
| E01 | tests/reading-calculations.test.ts | datesInRange returns inclusive date keys; activity periods support weekly default navigation and monthly views; isValidExternalUrl allows empty, http, and https values only; word reading materials use extra study assignment defaults and the listen URL | 과거 unit baseline; 18개 test 선언 대조·새 경계 대기 |
| E02 | tests/child-task-policy.test.ts | audio completion remains manual, requires a launch and does not require returnedAt; selection storage keys isolate owner, child and date including separators; completion snapshots never regress a later count | 과거 unit baseline; 11개 선언·hook cleanup 미증명 |
| E03 | tests/task-completion.test.ts | persisted-but-response-lost is reconciled without another write or increment; dispose/profile switch ignores late save responses and keeps owners separate | 과거 unit baseline; 19개 선언·실제 DB 경쟁 미증명 |
| E04 | tests/audio-return.test.ts | initial focus, visible and pageshow are not departure evidence; dispose/profile switch suppresses late save callbacks and all subsequent events | 과거 unit baseline; 23개 선언·실기기 미증명 |
| E05 | tests/completion-store.test.ts | subsequent guarded completion updates only its owner, assignment, task and expected count; guarded save rejects invalid count transitions without a write | 과거 unit baseline; 10개 선언·SDK query 대역 |
| E06 | tests/audio-return-store.test.ts | saveAudioReturn updates only returned_at on the matching unreturned launch; fetchAudioLaunch scopes owner, assignment and task and maps the persisted launch | 과거 unit baseline; 12개 선언·SDK query 대역 |
| E07 | scripts/smoke-audio-completion.mjs | selection-reload; saving-status; persistent-error; return-before-save-response; failed-save-retry; lost-response-result-check; stalled-result-check-recovery | 7개 run 선언 보존; client bundle/HTTP fixture·이번 실행 없음 |
| E08 | scripts/check-contracts.mjs; scripts/check-pwa.mjs; package.json | contracts/SW/PWA/typecheck/build 정적 gate, 기존 unit 실행기 | 이번 check:contracts만 PASS; 다른 gate는 과거 기록/정적 대조·런타임 보장 아님 |

## 결정 필요 입력 경계

이 항목들은 제품 결함으로 판정하지 않았다. 후속 step은 외부에서 도달 가능한 입력인지 확인하고 요구사항/기존 도메인 문서로 기대 결과를 정한다. 실패 계약이 확인되면 root에 증거를 보고하며 제품 코드를 임의 수정하지 않는다.

| ID | 확인할 경계 | 담당 step | 현재 처리 |
| --- | --- | --- | --- |
| Q01 | malformed/존재하지 않는 날짜, native date 입력 밖 조작의 처리 | 05·24 | 역전 범위=[]는 확정; 다른 invalid 날짜를 현재 출력으로 고정하지 않음 |
| Q02 | 검색 ilike의 %, _ 등 wildcard를 literal로 볼지 패턴으로 볼지 | 12·23 | 현재 요청 전달 대조만; escaping 정책을 새 요구로 추가하지 않음 |
| Q03 | 삭제 대상이 이미 없는 0행 결과를 idempotent 성공으로 볼지 | 14·24·26 | DB error 전파는 확정; 별도 오류 처리를 임의 추가하지 않음 |
| Q04 | callback next의 query/hash·SDK rejection, getUser 오류 상세 표시 | 17 | 같은 origin redirect·code/next 제거·no-store는 확정; 추가 정책 확인 |
| Q05 | 잘못된 cover URL의 이미지 load 실패 시 UI 대체 표시 | 20·30 | 없는 cover/단어 자료의 대체 표시만 확정; load fallback 신설 없음 |

## Step 02 실제 실행 기록

근거: Step 02 Cases to Verify와 docs/testing-guidelines.md. 러너 계약은 신규 테스트를 실제 발견·실행하고 실패를 최종 exit로 전달하는 것이다. 시간 기대값 2분 1초 → 3분은 기존 청취 계약이며 구현 계산을 기대값으로 복사하지 않았다. 모든 새 테스트/생성 fixture test 본문에 Given–When–Then이 있다.

| 사례 ID | 입력/행동 | 고정 기대 결과 | 실제 파일::테스트명 | 최종 결과 |
| --- | --- | --- | --- | --- |
| T01-N01 | 새 루트 .test.ts를 임시 프로젝트에 추가해 CLI 실행 | 새 test 이름 출력·emit·exit 0 | tests/harness/unit-runner.test.mjs::T01-N01: 새 루트 단위 테스트를 명령 한 번으로 컴파일하고 발견한다 | PASS |
| T01-E01 | tests/unit/domain/nested.test.ts 추가 | 중첩 test 이름 출력·exit 0 | tests/harness/unit-runner.test.mjs::T01-E01: tests/unit의 중첩 디렉터리 테스트를 발견한다 | PASS |
| T01-E02 | 2개 test 실행 후 1개 소스 삭제·재실행 | 삭제 test 출력/산출물 없음; 남은 test 실행·exit 0 | tests/harness/unit-runner.test.mjs::T01-E02: 소스 테스트를 삭제하면 다음 실행에서 오래된 산출물이 제거된다 | PASS |
| T01-E03 | lib는 있으나 test 0개 | 명시적 No emitted unit tests 오류·nonzero | tests/harness/unit-runner.test.mjs::T01-E03: 단위 테스트가 0개이면 빈 실행을 성공으로 처리하지 않는다 | PASS |
| T01-E05 | 마지막 test 삭제 후 재실행 | 옛 성공 emit 제거·0개 nonzero | tests/harness/unit-runner.test.mjs::T01-E05: 마지막 테스트 삭제 후 오래된 성공 산출물로 통과하지 않는다 | PASS |
| T01-F01 | 의도적 assertion 불일치 | 실제 not ok 출력·최종 nonzero | tests/harness/unit-runner.test.mjs::T01-F01: 단위 assertion 실패를 최종 명령의 nonzero exit로 전달한다 | PASS |
| T01-F02 | 성공 실행 후 TS2322 형식 오류 추가 | 컴파일 nonzero·옛/부분 emit 실행 없음 | tests/harness/unit-runner.test.mjs::T01-F02: 컴파일 오류가 나면 이전 산출물을 실행하거나 부분 emit하지 않는다 | PASS |
| T01-E06 | 다른 계층에 컴파일 오류 소스 배치 | unit만 발견/emit; 다른 계층 제외·exit 0 | tests/harness/unit-runner.test.mjs::T01-E06: component hook server browser harness 소스는 단위 컴파일과 발견에 섞이지 않는다 | PASS |
| T01-N02 | 한 fixture의 완료/중첩 자료/배열 변경 | 다른 fixture의 빈 로그·기본 데이터 유지 | tests/unit/test-fixtures.test.ts::T01-N02: 한 도메인 fixture의 완료와 중첩 자료 변경은 다른 fixture에 영향을 주지 않는다 | PASS |
| T01-N03 | 제어 Promise로 완료 저장 지연 후 resolve | release 전 row 0개·후 1회/3분; 다른 fake 불변 | tests/unit/test-fixtures.test.ts::T01-N03: 제어 Promise가 풀리기 전에는 완료 row가 저장되지 않고 풀린 뒤 1회 저장된다 | PASS |
| T01-E04 | 독립 시계 2개 중 하나를 121,000ms 이동 | 복귀 01:02:01Z·청취 3분; 다른 시계 01:00Z | tests/unit/test-fixtures.test.ts::T01-E04: 시계를 2분 1초 이동하면 청취는 3분이고 다른 시계는 시작 시각을 유지한다 | PASS |
| T01-F03 | 저장 전 Promise reject | 요청 실패·완료 row 0개 | tests/unit/test-fixtures.test.ts::T01-F03: 제어 Promise가 거부되면 저장은 실패하고 완료 row를 만들지 않는다 | PASS |

실행 증거: root의 `/tmp/ewd-step02-root-harness-final.log`(npm 8 PASS)·`/tmp/ewd-step02-root-harness-direct-escalated.log`(direct 8 PASS), `/tmp/ewd-step02-unit-direct.log`(각 emitted unit 파일 직접 실행 총 110 PASS), `/tmp/ewd-step02-typecheck.log`(exit 0). root 재실행 전 sandbox EPERM과 NODE_TEST_CONTEXT 재귀 skip 실패는 review.md에 별도 기록한다.

임시 프로젝트는 test마다 t.after로 제거하고 저장소/node_modules는 읽기 전용 symlink로 참조한다. subprocess env 복사본에서 NODE_TEST_CONTEXT를 제거하며 부모 env는 변경하지 않는다. helper는 신뢰된 타입의 테스트 입력만 받고 invalid 데이터 생성기를 일반화하지 않는다. Promise 거부는 실제 실패 계약으로 검증한다. DOM/storage/timer listener cleanup은 이 step에서 만들지 않아 N/A이고 Step 03·21·22에서 남아 있다.

## Step 03 호환성 사례

근거는 Step 03 실행·격리 계약과 기존 PASS/FAIL·OAuth·callback 계약이다. 전체 A01/A02/A04/C02/H02 묶음 완료를 뜻하지 않는다. quiz 타입 밖 값 강제는 N/A이며 실패 입력은 실제 fetch/환경 경계로 검증한다. 모든 테스트와 생성 probe 본문은 Given–When–Then이다.

| 사례 ID | 입력/행동 → 고정 기대 결과 | 실제 파일::테스트명 ID | 결과 |
| --- | --- | --- | --- |
| C02-N01 | 결과 null에서 PASS 클릭 → PASS callback 1회, props 갱신 전 선택은 비선택 유지 | tests/components/assignment-quiz-score.test.tsx::C02-N01 | PASS |
| T01-E07 | StrictMode·새 배정/FAIL/callback rerender·unmount → 새 callback 1회/선택 표시/DOM 제거 | tests/components/assignment-quiz-score.test.tsx::T01-E07 | PASS |
| A04-N01 | Google 클릭 → publishable env 전달·google/select_account·현재 origin callback·제출 disabled | tests/components/auth-panel.test.tsx::A04-N01 | PASS |
| T01-E08 | test-only StrictMode effect·tick/event·unmount → 각각 1회·잔여 timer 0·후속 event 무효 | tests/hooks/lifecycle-harness.test.tsx::T01-E08 | PASS |
| T01-E09/E10 | DOM/storage/env/spy/timer 생성 후 다음 test → 비상속; 다음 test는 독립 실행도 가능 | tests/hooks/lifecycle-harness.test.tsx::T01-E09/E10 | PASS |
| A02-N01·A01 일부 | Node code 교환·cookie adapter → 같은 origin /today, 307/private no-store·factory env/cookie 전달 | tests/server/auth-callback.test.ts::A02-N01 | PASS |
| A02-E01 | code 없음 → SDK 호출 0·/auth/error, 307/private no-store | tests/server/auth-callback.test.ts::A02-E01 | PASS |
| T01-F04 | fetch rejection을 catch → 실제 caught-network-probe 실패 1개·Unexpected fetch·nonzero | tests/harness/component-server-runner.test.mjs::T01-F04 | PASS |
| T01-F05 | Node에서 RTL hook 실행 → 실제 wrong-environment-probe 실패 1개·document is not defined·nonzero | tests/harness/component-server-runner.test.mjs::T01-F05 | PASS |

실행 결과: component 3파일·6 test, server 2 test, probe 2 test PASS; 기존 unit 110 PASS와 typecheck exit 0. 로그와 최초 실패·해결은 task Execution Record 및 review의 Step 03 Execution에 연결한다. 제품 hook H02의 15초/요청 경쟁과 실제 Next async Page/DB/RLS/OAuth는 이 호환성 검증에 포함하지 않는다.
