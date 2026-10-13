# Step 07 — 자료 준비 상태와 배정 후보

## Status

Complete — 2026-10-14 구현·필수 unit 검사 PASS. 제품 코드는 변경하지 않았으며 Step 08은 시작하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

자료 유형별 준비 상태, 외부 URL, 활동 구분·task·오디오 링크, 후보 검색·시리즈·정렬·표시 제한, 미래 배정 필터를 표 기반으로 검증한다.

대상 코드:

- lib/reading-calculations.ts

예상 산출물: tests/reading-calculations.test.ts 확장.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 일반 책·단어 읽기 검색과 활동 선택 | 자료별 허용 활동과 링크를 선택한다 |
| 경계 | 검색 없음 10개·검색 있음 20개·중복 선택·배정 이력·공백 | 상한과 포함/제외 규칙이 맞고 입력 배열이 변하지 않는다 |
| 잘못된 입력/실패 | javascript/data URL·깨진 URL | 실제 URL 검증 경계가 거부하며 빈 URL 허용과 필수 입력 검증을 구분한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 책/단어 읽기×활동 구분×task 조합의 유효 사례와 적용 불가 사례를 기록한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/reading-calculations.test.ts`: D03-N01/E01, D04-N01/E01/F01, D05-N01/E01/E02, D06-N01/E01. 전체 매핑은 `scenarios.md`에 기록했다. |
| 실행 명령/결과 | 2026-10-14 root 최종 `npm run test:unit` exit 0; 127 PASS, fail/skip/todo 0 (`verification-artifacts/step07-unit-root-final.log`). |
| 신규 동작/기존 동작 | 기존 자료 준비·URL·후보·활동·예정 배정 회귀를 Given–When–Then으로 최소 보강했다. 일반 책/단어 읽기, URL helper와 준비 상태의 구분, 검색/시리즈/정규화/상한/입력 불변성, 실제 UI 허용 활동 선택을 확인한다. |
| 결함 재현 RED → GREEN | 제품 결함 없음. 최초 unit 컴파일은 일반 책 fixture의 `contentType` 누락으로 FAIL했으며, 실제 도메인 값 `book`을 명시한 테스트 fixture 수정 후 PASS했다. 제품 코드는 변경하지 않았다. |
| 미검증·제외·후속 | Step 02의 신규 파일 발견·실패 exit·정리 증거를 재사용했다. 이 순수 helper는 DB/네트워크/시간 전역 상태를 만들지 않는다. SQL `ilike` wildcard 정책은 Q02 및 Step 12/store 경계에 남겼고, 폼 저장·UI 흐름은 Step 19/23/24, DB/RLS·실기기는 범위 밖이다. 타입 밖 category/task는 `as any`로 만들지 않았다. |
| 최종 리뷰 | 최초 Standards P2의 GWT Then 호출·URL 시나리오 결합 2건과 Spec P3의 공백 URL·self no-audio 2건을 수정했다. stale scenarios 테스트명 P2도 수정했으며 최종 Standards 0 findings, Spec 0 findings이다. |
