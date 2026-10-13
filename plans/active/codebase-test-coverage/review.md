# Review

## Status

In Progress

Step 01의 문서 구현과 필수 검사는 완료했다. 루트의 두 축 검토·커밋은 대기이며 Step 02–33은 Pending이다. 전체 자동 계획 또는 런타임 검증이 완료됐다는 의미가 아니다.

## Planning Status

계획 문서 작성 완료: 8개 phase / 33개 step / 43개 핵심 시나리오 묶음.

사용자는 주요 동작 전체 검증을 선택했고, 실기기는 후속 확인하도록 선택했다. 이후 로컬 DB가 없다고 알려 실제 DB/RLS 검증은 필수 자동 범위에서 제외하는 권장안을 반영했다. 현재 환경 기준으로 진행하며 별도로 로컬 구축을 요청하면 후속 계획을 작성한다.

## Plan Conformance

- 변경 범위는 이 계획 디렉터리의 문서뿐이다.
- 테스트·앱·Supabase migration·패키지 코드는 변경하지 않았다.
- 사용자의 전체 순차 구현·step별 커밋 요청을 반영했다. 현재 개발 pane은 Step 01만 수행하고 검토·커밋·다음 step 전달은 루트가 맡는다. push·배포 권한은 없다. 사용자 제공 초기 계획 문서 38개는 첫 step 커밋 범위다.
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
- 새 러너 및 source 커버리지 수치는 아직 측정하지 않았다. 계획에 특정 신규 버전이나 임의 전역 수치 gate를 확정하지 않았다.

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

계획 작성 시 모든 step은 Pending이었다. 현재 Step 01만 Complete이며 진행 결과는 각 task Execution Record와 이 표에 함께 기록한다.

| Phase | Step | Status | 실행한 검사/결과 |
| --- | --- | --- | --- |
| 0 | 01 검증 계약과 전체 코드 목록 확정 | Complete | check:contracts exit 0; 문서/파일/API/증거 대조 exit 0. 루트 검토·커밋 대기. |
| 0 | 02 단위 테스트 실행기와 공통 fixture | Pending | 미실행 |
| 0 | 03 컴포넌트·hook·서버 테스트 기반 | Pending | 미실행 |
| 0 | 04 브라우저 fixture와 실제 Next 실행 구분 | Pending | 미실행 |
| 1 | 05 날짜와 주·월 경계 | Pending | 미실행 |
| 1 | 06 초기 데이터와 입력 초안 복사 | Pending | 미실행 |
| 1 | 07 자료 준비 상태와 배정 후보 | Pending | 미실행 |
| 1 | 08 횟수·진행률·활동 기록 | Pending | 미실행 |
| 2 | 09 전체·프로필 조회와 row 매핑 | Pending | 미실행 |
| 2 | 10 오늘·예정 배정의 embedded 데이터 조회 | Pending | 미실행 |
| 2 | 11 부모 활동 범위 조회 | Pending | 미실행 |
| 2 | 12 자료 관리·시리즈·배정 이력 조회 | Pending | 미실행 |
| 2 | 13 아동·자료 저장과 활성 상태 | Pending | 미실행 |
| 2 | 14 배정·퀴즈·수동 기록 저장 | Pending | 미실행 |
| 2 | 15 완료·실행 저장 기존 회귀 보강 | Pending | 미실행 |
| 3 | 16 인증 설정과 Supabase client 경계 | Pending | 미실행 |
| 3 | 17 인증 callback·middleware·서버 페이지 | Pending | 미실행 |
| 3 | 18 로그인·로그아웃 UI | Pending | 미실행 |
| 4 | 19 배정 picker와 편집·퀴즈 컴포넌트 | Pending | 미실행 |
| 4 | 20 완료 안내·활동 셀·자료 표시 | Pending | 미실행 |
| 4 | 21 배정 선택 복원 hook | Pending | 미실행 |
| 4 | 22 완료·복귀 hook 수명주기 | Pending | 미실행 |
| 5 | 23 프로필·자료 등록과 관리 흐름 | Pending | 미실행 |
| 5 | 24 배정 생성·갱신·편집·삭제 흐름 | Pending | 미실행 |
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
- 완료 기준 검토 후 첫 step 커밋으로 초기 사용자 제공 계획 문서 38개를 함께 기록한다.

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
