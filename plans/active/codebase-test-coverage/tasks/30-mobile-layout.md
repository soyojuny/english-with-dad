# Step 30 — 모바일 레이아웃과 접근 가능한 조작

## Status

Complete — 사용자 승인 Step30a의 최소 CSS 수정 후 기존 21개/21 PASS (2026-10-19). 독립 verify 및 browser 프로젝트별 검증·루트 검토 완료. 전체 실행의 초기 U06 실패와 test 동기화 보완은 review.md에 구분 기록했다.

## Phase

Phase 6 — 이미지·QR·PWA·모바일.

## What to Build

360/390px 모바일과 데스크톱에서 주요 카드·폼·dialog·활동표, 긴 한국어 제목/자료명과 오류 안내·키보드 조작을 확인한다. 실제 앱 구동 후 DOM 크기/버튼 접근을 중심으로 검사하고 화면 캡처는 보조 증거로 쓴다.

대상 코드:

- styles.css
- app/layout.tsx
- app/reading-manager-client.tsx
- public/manifest.webmanifest

산출물: `tests/browser/client/mobile-layout.spec.mjs`; `follow-up.md`의 실기기 체크리스트·모바일 양식 폭 RED 기록. 기존 fixture 변경 없음.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 모바일에서 등록→배정→완료·dialog 조작 | 주요 버튼과 안내를 클릭·읽을 수 있고 문서 전체가 불필요하게 넘치지 않는다 |
| 경계 | 긴 제목·최대 횟수·많은 자료·가로 스크롤 활동표 | 의도된 표 스크롤과 전체 화면 잘림을 구분한다 |
| 잘못된 입력/실패 | 오류 문구·권한 거부 상태·좁은 viewport | 오류와 재시도 버튼이 겹치거나 가려지지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] Android 설치·실제 카메라·외부 오디오 앱 복귀는 자동 완료 gate에서 제외하고 후속 항목으로 남긴다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run check:pwa

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 19](./19-assignment-components.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 23](./23-profile-material-flow.md)
- [Step 24](./24-assignment-flow.md)
- [Step 25](./25-child-completion-flow.md)
- [Step 26](./26-report-manual-log-flow.md)
- [Step 28](./28-camera-upload.md)
- [Step 29](./29-service-worker.md)

## Execution Record

Pending → In Progress → Complete (2026-10-19). 초기 test-only RED를 보존했고 사용자 승인 Step30a에서 styles.css만 최소 수정했다.

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/browser/client/mobile-layout.spec.mjs`: 360/390/1280×900px, P02-N01/N02/E01/E02/E03/F01/F02 총 21개. 기존 profileMaterial/assignment/audio/parentReport fixture 재사용; fixture 확장 없음 |
| 조작 계약 | N01 실제 책 추가/저장 payload; E01 검색 상한 20(24개 seed)/역순 books[23]/최대3회/실제 생성·결과카드; N02 오디오 버튼→Tab→완료 focused→Enter; F01 저장 실패 안내/실제 recover·retry·count1; F02 링크 입력→Tab→QR Enter·권한거부·업로드 hit target·키보드 닫기/제거 |
| DOM 계약 | 문서 scrollWidth≤viewport+1; 실제 label/action 위치·최소24px 크기·중앙/양끝 hit test. 긴 제목·label·오류는 text range/overflow clipping·근처 컨트롤 교차 검사. 입력 내부 긴 값의 정상 스크롤 제외. 활동표 .table-wrap 내부 scroll delta와 문서 전체 폭 분리 |
| 초기 좁은 검사 | `npm run test:browser:client -- mobile-layout.spec.mjs`: initial 9 FAIL/9 PASS; exact label, 후보24 기대, uncertain status를 alert로 찾은 테스트 설정 오류였음. 초기 실패를 제품 결함으로 분류하지 않음; `verification-artifacts/step30-focused-initial.log` |
| 중간 실행 | `verification-artifacts/step30-focused-final-red.log` 및 `step30-assignment-child-focused.log`는 E01 생성 후 disabled를 enabled로 검사한 중간 테스트 오류가 섞여 최종 제품 RED 근거로 사용하지 않는다. 최종 근거는 아래 source-final 실행이다 |
| 최종 소스 21개 실행 | 루트 요청으로 `npm run test:browser:client -- mobile-layout.spec.mjs` 1회 실행: 17 PASS/4 제품 overflow RED, exit 1 (24.4s); `verification-artifacts/step30-final-source-red.log`. 360/390 N01 제목 right402, 360 E01 생성 전 버튼 right364, 390 E01 실제 생성 후 document410px. locator/fixture/disabled 기대 오류 없음. 실행 후 테스트 소스 변경 없음 |
| 최종 E01 재검증 | `npm run test:browser:client -- mobile-layout.spec.mjs --grep 'P02-E01'`: 2 모바일 overflow RED/desktop 1 PASS, exit 1; `verification-artifacts/step30-assignment-source-final.log`; 생성 전 target/생성 후 payload·결과카드·문서폭만 검사. 제품 기대값 완화 없음 |
| 긴 아동 카드 재검증 | seed 후 reload로 초기 프로필을 다시 읽도록 정정. `verification-artifacts/step30-assignment-child-focused.log`에서 E03 세 폭 모두 PASS; 45초 timeout은 fixture 초기 조회 시점 오류, 제품 결함 아님 |
| 등록 RED 진단 | `npm run test:browser:client -- mobile-layout.spec.mjs --grep 'P02-N01'`: 360/390 RED + desktop PASS; `verification-artifacts/step30-registration-red.log`. JSON geometry attachment: 모바일 .management-grid 가용336/366px에 track436px, .parent-section436px, h2/입력402px, 문서448px. desktop document1280px 정상 |
| 정적·발견 검사 | `npm run check:pwa` PASS (`verification-artifacts/step30-pwa.log`); `npm run test:browser:client -- mobile-layout.spec.mjs --list` 21개 발견 (`verification-artifacts/step30-discovery.log`); `git diff --check` PASS. 실제 browser는 sandbox 밖 Chromium count이며 node 테스트 추가/실행 없음 |
| 실패 전달·정리 | 원래 필수 overflow assertion이 실제 exit 1로 전달되고 trace/screenshot/요청 attachment 보존. 독립 context와 기존 clientServer 임시 bundle/HTTP 정리 재사용; 신규 skip/expected-fail 없음 |
| 제품 수정 전 보고 | 등록 360/390px overflow를 루트에 먼저 보고. root가 Step 30a 작성/사용자 승인 요청 중이며 이 pane은 30a와 제품 CSS를 수정하지 않음. 기존 4종 결함/6 expected-fail·별도 Step31a 수정도 포함하지 않음 |
| 임시 CSS 진단 | 테스트 범위의 임시 context에 media .management-grid minmax(0,1fr) 한 줄만 주입. N01 모바일2 PASS (`step30-width-probe.log`), 실제 제품 GREEN 아님. E01은 별도 3px 넘침이 남음 (`step30-assignment-width-probe.log`); 초기 probe의 생성후 disabled→enabled 기대는 테스트 오류로 제외. 임시 spec은 finally에서 제거, 영구옵션/제품 변경 없음 |
| 독립 Phase 6 회귀 | component 13파일/106 PASS + 기존 expected-fail 4개, server 4파일/32 PASS + 기존 expected-fail 1개, harness 28 PASS(fail/skip/todo 0), 모두 최종 exit 0. `verification-artifacts/step30-independent-{component,server,harness}.log`; harness 초기 sandbox 실패는 별도 `step30-independent-harness-sandbox.log`에 보존 |
| 미검증·제외·인계 | 실제 Next app/layout·manifest는 Step29 증거와 구분; 이 suite는 실제 client UI/CSS + HTTP 대역. Android 설치/실카메라/외부오디오 복귀/실제DB·RLS·OAuth 제외. 전체 verify/browser·build/typecheck는 아직 미실행이며 독립 테스트 pane 담당. commit/push/다른pane제어/Step31 착수 없음 |

아래 승인된 Step30a 최종 GREEN으로 필수 RED를 해소해 Complete로 전환했다.

승인 전 추가 배정 원인 진단: 한 줄 management-grid CSS만 주입한 360px에서 `.book-form` 가용302px인데
form track/`fieldset.book-picker`는364px이며 fieldset의 computed `min-inline-size`/`min-width`는
`min-content`다. 브라우저 fieldset 기본 minimum이 별도 원인이며 최소 후보는
`styles.css`의 `.book-picker { min-inline-size: 0; }`다. 당시에는 아직 주입·효과 확인 또는 제품 적용하지 않았다. 현재 적용 결과는 아래 승인 후 최종 결과를 따른다.
`verification-artifacts/step30-assignment-minimum-probe.log`에 단일 context 측정값을 보존했다.
임시 진단 spec의 괄호 문법 오류 1회는 본문 실행 전의 probe 오류로 수정했으며 제품 결함에 합산하지 않는다.
임시 spec은 모두 제거됐다. 제품 GREEN이나 승인 근거로 표현하지 않는다.

## Step30a 승인 후 최종 결과 — 2026-10-19

사용자가 “그렇게 하자”로 승인했다. `styles.css`의 기존 max-width1100px media에만
management-grid minmax(0,1fr), book-picker min-inline-size0,
book-picker 내부 library-tools와 select의 max-inline-size100%를 적용했다.
마지막 보완은 긴 시리즈 필터의 고유338px 폭이 오른쪽380px까지 넘치는 실제 원인에 한정한다.
테스트/fixture/assertion은 수정하지 않았고 내용 삭제·overflow 숨김·SW/manifest 변경도 없다.

| 최종 명령/측정 | 결과 |
| --- | --- |
| `npm run test:browser:client -- mobile-layout.spec.mjs` | 21 PASS, exit0 (21.7s); `verification-artifacts/step30a-mobile-layout-green.log`; 기준 `step30-final-source-red.log` 17 PASS/4 RED → GREEN |
| 360px E01 선행 좁은 검사 | 1 PASS; `verification-artifacts/step30a-360-assignment-green.log` |
| 실제 등록 document 폭 | 360→360px, 390→390px, desktop1280→1280px. grid336/366px, heading302/332px; desktop 기존 두 열530.094/647.906px 유지 |
| 측정 artifact | `verification-artifacts/browser-1792402860304-389077/report.json`의 registration-layout-geometry |
| 정적 검사 | check:contracts/check:pwa/diff-check PASS; `step30a-contracts.log`, `step30a-pwa.log` |

독립 component106 PASS+기존4 expected-fail/server32 PASS+기존1/harness28 PASS 기록은 보존한다.
전체 verify/browser 및 독립 review는 루트에 인계한다. commit/push/다른pane제어/Step31 착수 없음.
