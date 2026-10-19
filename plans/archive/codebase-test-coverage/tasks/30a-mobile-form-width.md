# Step 30a — 모바일 자료·배정 폼의 가로 넘침 수정

## Status

Complete — 사용자 “그렇게 하자”로 승인 (2026-10-19). 승인된 폼 최소 CSS 수정으로 기존 Step30 source/assertion의 4 RED → 21/21 PASS를 확인했다. 전체 Phase6 gate는 독립 pane/루트 담당이다.

## Reproduction and Contract

Step 30 P02-N01에서 긴 한국어 자료를 등록한 뒤 360/390px 화면의 문서 폭이 448px로 늘어난다.
360px의 `.management-grid` 가용 폭은 336px인데 실제 grid track은 436px, 자료 폼 heading과 control은 402px다.
1280px 등록 시나리오는 통과한다. 폼의 label과 저장 action은 화면 안에서 읽고 조작할 수 있어야 한다.
배정 폼에는 별도로 `fieldset.book-picker`의 브라우저 기본 `min-inline-size: min-content`가
가용 폭 302px보다 큰 364px 열을 만들어 넘침을 일으킨다. grid 수정만 임시 주입한 뒤에도
360/390px 배정 완료 화면의 문서 폭이 3px 초과하는 실패가 남았다.

근거: `verification-artifacts/step30-registration-red.log`,
`verification-artifacts/browser-1792401763365-368630/report.json`의 registration-layout-geometry·trace·화면.
구현 pane과 독립 테스트 pane이 실제 overflow임을 확인했다. locator/text overlap 검사 오류와 구별했다.

## Approved Minimal Fix

`styles.css`의 기존 `@media (max-width: 1100px)` 안에서 다음 세 규칙을 적용·검증했다.

- `.management-grid`의 단일 열을 `1fr` 대신 `minmax(0, 1fr)`로 제한한다.
- `.book-picker`에 `min-inline-size: 0`을 지정해 fieldset의 기본 최소 너비를 해제한다.
- `.book-picker .library-tools`와 그 `select`에 `max-inline-size: 100%`를 지정해 긴 시리즈 option의 고유338px 폭을 부모 안으로 제한한다.

grid 한 줄만 임시 주입한 진단에서는 등록 360/390px 두 시나리오가 통과했다.
두 규칙을 함께 주입한 진단 결과는 실행 후 아래 기록에 연결한다. 임시 주입은 제품 GREEN이 아니다.
360px 배정 생성 후 남은 넘침도 같은 모바일 자료·배정 폼의 최소 너비/줄바꿈 CSS에 한정해
원인을 확인하고 수정한다. 두 규칙만으로 전체 해소됐다고 가정하지 않는다.
범용 overflow 숨김, 내용 삭제, 데스크톱 2열 재설계, manifest/SW 변경은 포함하지 않는다.

## Verification

1. P02-N01의 기존 360/390px RED assertion을 유지한다.
2. 승인된 최소 CSS 수정 뒤 같은 테스트의 GREEN과 1280px 기존 동작을 확인한다.
3. 구현 pane은 Step30 전체 모바일 파일만 실행한다. Phase6 전체 suite·verify는 사용자 지시에 따라 독립 테스트 pane/루트가 수행한다.
4. RED → GREEN 근거와 최종 CSS 범위를 Step 30/30a 및 review에 기록한다. 루트가 커밋한다.

## Execution Record

아래 초기 RED/probe를 보존한 뒤 사용자 명시 승인(2026-10-19)으로 제품 최소 수정과 최종 GREEN을 확인했다.

- 최종 원본 소스 21개 실행: 17 PASS / 모바일 N01·E01 4 FAIL, exit 1;
  `verification-artifacts/step30-final-source-red.log` (24.4s). 기대값 완화/skip/expected-fail 추가 없음.
- 두 CSS 규칙 임시 주입: N01 360/390px와 E01 390px 3 PASS, E01 360px는 배정 생성 뒤
  문서 폭 380px로 1 FAIL; `verification-artifacts/step30-two-rule-width-probe.log` (7.6s).
  실제 제품 GREEN이 아니며, 360px의 남은 원인은 수정 승인 후 확인한다.
- 임시 probe spec은 finally에서 제거했다. 제품 CSS는 변경하지 않았다.

### 승인된 구현·최종 검증

두 기본 규칙 적용 후 단일360px 진단에서 남은 요소는 `.book-picker .library-tools`와 `select`였다.
긴 시리즈 option의 고유폭338px로 left42/right380px가 되어 document380px를 만들었다.
`verification-artifacts/step30a-two-rules-diagnostic.log`에 computed CSS/geometry를 보존했다.
승인 범위의 동일 폼 CSS 보완으로 이 두 요소의 max-inline-size만100%로 제한했다.

- 선행 E01 360px: 1 PASS, exit0 (`step30a-360-assignment-green.log`).
- 기존 Step30 21개 source/assertion 그대로 전체 실행: **21 PASS, exit0 (21.7s)**;
  `verification-artifacts/step30a-mobile-layout-green.log`.
- 기준 `step30-final-source-red.log`의17 PASS/4 FAIL → 최종21 PASS. 1280px7개도 PASS.
- 등록 document 폭:360/390/1280 모두 viewport와 동일. 모바일 grid track336/366px,
  heading302/332px; desktop 두 열530.094/647.906px 유지.
  artifact: `verification-artifacts/browser-1792402860304-389077/report.json`.
- check:contracts/check:pwa/diff-check PASS (`step30a-contracts.log`, `step30a-pwa.log`).
- 테스트·fixture·JS·데이터·manifest/SW 변경 없음. 임시 진단 spec 제거.
- full verify/browser·build/typecheck는 독립 pane/루트가 수행한다. 실제 Android/카메라/DB·RLS·OAuth 제외.
- 사용자 승인 범위 내 CSS만 수정했으며 commit/push/다른pane제어/Step31 착수 없음.

### 독립 gate와 최종 검토

독립 `verify` exit 0(unit 276 PASS, typecheck/build 포함). 최초 전체 browser는 U06-N01의
테스트 이탈 시점 문제로 exit 1이며 Next/Auth 4·PWA 4는 PASS였다. 두 U06 테스트에서 팝업 호출
완료 후 이탈하도록 대기를 명시한 뒤 6회 반복 PASS, 최신 client 전체는 ordinary 112 PASS +
기존 expected-fail 1, exit 0이다. 원래 실패와 변경 없는 다른 프로젝트의 증거를 구분하며
단일 전체 browser exit 0은 주장하지 않는다. 로그와 한계는 review.md의 루트 최종 검증에 연결한다.
독립 CSS 및 루트 최종 Standards/Spec 검토는 0/0 findings다.
