# Step 26 — 부모 활동표·수동 기록·출력

## Status

Complete — 브라우저 HTTP fixture와 시나리오를 검증했다. 제품 코드는 변경하지 않았다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

주간 기본값·월간 전환·이전/다음·아동 변경, 활동 구분/시간/횟수/퀴즈·시리즈 진행률, 부모/아동 수동 기록과 삭제·인쇄를 검증한다.

대상 코드:

- app/reading-manager-client.tsx:활동표/수동 기록/출력 흐름
- styles.css

실제 산출물: `tests/browser/client/parent-report.spec.mjs`.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 완료 기록과 수동 기록을 부모 화면 조회 | 올바른 아동·기간·활동 칸과 합계를 표시한다 |
| 경계 | 기록 0개·월/연말·퀴즈만 존재·비활성 책 기록 | 빈 상태와 기록 보존 계약을 확인한다. 진행률 상한은 D07/Step 08 순수 계산 범위다. |
| 잘못된 입력/실패 | 조회/기록 저장/삭제 실패·인쇄 준비 실패 | 기존 자료를 잘못 합치거나 성공으로 안내하지 않는다 |

### 구현 전 작은 시나리오 분해

| ID | 분류 | browser 관찰 범위 |
| --- | --- | --- |
| U08-N01 | 정상 | 주간 기본 보고서의 활동·시간·횟수·퀴즈와 비활성 책 이력 |
| U08-N02 | 정상 | child-2의 positive completion만 표시하고 child-1 기록을 제외하는 프로필 전환 |
| U08-N03 | 정상 | copywork·quiz-only 기록의 날짜/category cell 배치 |
| U08-E01 | 경계 | 월 전환과 이전/다음의 연말 range query |
| U08-E02 | 경계 | 빈 기간의 7일 calendar와 zero stats, stale title 배제 |
| U09-N01 | 정상 | 부모 수기 추가의 owner/child payload와 보고서 연결 |
| U09-N02 | 정상 | 부모 수기 삭제의 matching owner/id request와 화면 제거 |
| U09-N03 | 정상 | 아동 quick-log의 오늘/선택 아동 payload와 부모 보고서 연결 |
| U09-N04 | 경계 | 준비된 주간 데이터의 print media/at-call snapshot·screen 복원 |
| U09-F01 | 잘못된 입력 | 빈 부모 수기 제목은 write 없음 |
| U09-F02 | 실패 | 부모 수기 저장 실패는 성공 UI/local mutation 없음 |
| U09-F03 | 실패 | 부모 수기 삭제 실패는 기존 기록 유지 |
| U09-F04 | 실패 | print 준비 range query 실패는 print 호출 없음 |
| U09-F05 | 잘못된 입력 | 빈 아동 quick-log 제목은 write 없음 |
| U09-F06 | 실패 | 아동 quick-log 저장 실패는 dialog와 입력 유지 |
| U09-F07 | expected-fail | settled child profile 전환 뒤 pending print가 1회 호출됨(기대 0); 제품 follow-up |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 인쇄는 print media DOM/호출과 복원 상태까지 자동 검사하며 실물 출력 품질은 후속 확인한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 05](./05-dates-periods.md)
- [Step 08](./08-tasks-progress-logs.md)
- [Step 11](./11-store-parent-period.md)
- [Step 14](./14-store-assignment-log-write.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 25](./25-child-completion-flow.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/browser/client/parent-report.spec.mjs`: U08-N01/E01/E02/N02/N03, U09-N01/N02/N03/F01/F02/F03/F04/F05/F06/N04/F07. fixture: `tests/browser/support/client-fixture.mjs::parentReport`. |
| 실행 명령/결과 | final focused ordinary 15 PASS + U09-F07 1 expected-fail, exit 0 (`step26-focused-root-final.log`, `browser-1792396519646-279697/report.json`); U09-F04 narrow 1 PASS (`step26-print-failure-root-final.log`, `browser-1792396627721-282315/report.json`). full client ordinary 68 PASS + same expected-fail (`browser-1792396552817-280564/report.json`); audio 7 PASS (`browser-1792396615974-281891/report.json`). Phase 5 verify exit 0 (`step26-verify-root-final.log`: contracts/SW/PWA/unit 17/typecheck/build); component 11 files/91 PASS + existing component expected-fail 4 (`step26-component-root-final.log`). |
| 신규 동작/기존 동작 | 제품 변경 없이 `tests/browser/client/parent-report.spec.mjs` 및 strict parent HTTP fixture를 추가했다. fixture는 허용된 table/method/query-key/operator와 필수 filter-key 존재를 검증하고, GET/DELETE filter row는 제공된 값으로 처리한다. 시나리오 assertion은 parent/child POST payload를 검증한다. 정확한 projection/order 강제는 이 browser double 범위가 아니며 Step 11/14 단위 증거로 분리한다. |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | U09-F07 product follow-up: settled child profile 뒤 pending print가 1회 호출된다(기대 0); expected-fail만 기록하고 제품은 수정하지 않았다. fixture는 실제 DB/RLS/OAuth, 물리 출력 품질, Android를 검증하지 않는다. 진행률 상한은 report DOM surface가 없으므로 D07/Step 08 `countAssignmentProgress` 단위 증거에만 연결하며 새 UI 주장을 만들지 않는다. |
