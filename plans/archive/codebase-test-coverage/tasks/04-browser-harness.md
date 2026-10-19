# Step 04 — 브라우저 fixture와 실제 Next 실행 구분

## Status

Complete — verify exit 0, component 6 PASS, server 2 PASS, harness 13 PASS, TZ=America/Los_Angeles browser 9 PASS 및 최종 typecheck exit 0을 기록했다.

## Phase

Phase 0 — 검증 기반과 실행 환경.

## What to Build

기존 7개 오디오 시나리오를 보존하며 Playwright 실행을 재현 가능하게 정리한다. HTTP fixture 클라이언트 검사와 실제 Next 서버 검사에 별도 실행 이름을 둔다. SSR 요청은 page.route만으로 대체되지 않으므로 실제 Next용 로컬 HTTP Auth 대역을 먼저 작은 로그인/비로그인 사례로 검증한다. 운영 URL 요청은 허용하지 않는다.

대상 코드:

- scripts/smoke-audio-completion.mjs
- package.json
- next.config.mjs

예상 산출물: tests/browser/; 브라우저 fixture; 실행·artifact 안내.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 동일 fixture로 두 번 실행 | 독립 browser context와 같은 결과를 만든다 |
| 경계 | HTTP 지연·실패·재로드·프로필 전환 | 테스트가 원인을 구분하고 오디오 기존 시나리오를 발견한다 |
| 잘못된 입력/실패 | 미등록 요청·서버 시작 실패 | 요청을 명시적으로 실패시키고 종료·artifact를 정리한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 클라이언트 번들 검사를 실제 Next E2E로 보고하지 않으며 실패 시 trace·화면·요청 기록을 남긴다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:audio-browser (기존 도구 준비 필요)
- test:browser 제안 명령
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | tests/browser/client/audio-completion.spec.mjs의 기존 7개(E07·H01/C03/U05/U06/U07); tests/browser/next/auth-feasibility.spec.mjs(T01-N05/N06·A03 일부); tests/harness/browser-runner.test.mjs(T01-N07/F06/F07) |
| 실행 명령/결과 | TMPDIR=$PWD/verification-artifacts/tmp, PLAYWRIGHT_BROWSERS_PATH=$PWD/verification-artifacts/playwright-browsers. root test:browser:next 2 PASS, test:audio-browser 7 PASS(step04-next-feasibility-final.log·step04-audio.log); npm run verify exit 0(phase00-verify.log), test:component 6 PASS/test:server 2 PASS(phase00-component.log·phase00-server.log). 최초·2차 test:harness는 각각 12 PASS/1 FAIL(phase00-harness.log·phase00-harness-final.log): T01-F06의 독립 요청 JSON 파일 누락. JSON 저장 뒤 T01-F06 단독 1 PASS(step04-artifact-final.log), 최종 npm run test:harness 13 PASS(phase00-harness-final-2.log). TZ=America/Los_Angeles npm run test:browser 9 PASS(phase00-browser.log). 최종 npm run typecheck exit 0(step04-typecheck-final.log) |
| 신규 동작/기존 동작 | @playwright/test 1.64.0/esbuild 0.28.2 exact pin(root 설치). client-http·next-auth-http 프로젝트/독립 명령, 명령별 report와 실패 trace/screenshot/요청 기록 추가. 기존 7개 이름·행동·assertion과 test:audio-browser 명령 유지, fixture 시간만 고정. 제품/프레임워크/next.config 변경 없음 |
| 결함 재현 RED → GREEN | 제품 결함 수정 없음. 최초 Next feasibility 2 FAIL(step04-next-feasibility.log): dev npm 버전 확인 요청 차단·프로필 선택 전 로그아웃 기대; framework 요청을 외부 전송 없이 503 대체하고 shell 기대 수정 후 2 PASS. 최초 Standards 2건은 Node TZ 의존 날짜를 고정 한국 날짜로, 실대기를 locator/fixture 조건·Playwright clock(3초/15초)으로 교체해 해소했다. 재검토 Standards는 0 findings였고, Spec 재검토는 T01-F06 요청 JSON artifact 누락 1건을 발견했다. context 종료 전 screenshot 저장 및 독립 JSON 파일 저장으로 보완해 단독 probe 1 PASS와 최종 harness 13 PASS로 해소했다 |
| 미검증·제외·후속 | 실제 Auth/OAuth·JWT 검증·DB/RLS·실기기 제외 유지. synthetic cookie→middleware/Page→로컬 Auth HTTP→SSR HTML 연결만 검증한다. service worker는 block하며 실제 동작은 Step 29. 상세 프로필/학습 시나리오는 후속 step; fixture의 프로필 선택·재로드·지연/실패 회귀만 유지. source coverage 신규 측정/gate 없음 |

정리: Playwright context는 test별 독립이다. client의 지연 응답을 해제하고 worker HTTP server/bundle을 finally에서 정리한다. Next는 .env.local 없는 복사본의 .next와 로컬 Auth HTTP를 사용하며 context/HTTP/Next process group/임시파일을 finally로 종료·삭제한다. 생성 파일·cache는 ignored artifact 아래, 실패 artifact는 보존한다. SSR은 page.route로 대체하지 않는다. 서버 시작 실패 probe는 브라우저가 없으므로 trace/화면 N/A, Next 로그/cleanup.json으로 원인과 정리를 검사한다.
