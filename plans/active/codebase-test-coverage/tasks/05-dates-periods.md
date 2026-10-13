# Step 05 — 날짜와 주·월 경계

## Status

Complete — 2026-10-14 구현 및 필수 unit 3개 환경 PASS. 제품 코드는 변경하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

dateKey, formatDate, formatTime, datesInRange, 기간 범위·이동·표시를 검증한다. 현재 주 시작은 일요일이고 month 이동은 해당 월 1일인 계약을 기록한다. 로컬 날짜를 UTC 문자열 날짜와 혼동하지 않도록 Asia/Seoul·UTC 실행을 구분한다.

대상 코드:

- lib/reading-data.ts
- lib/reading-period.ts
- lib/reading-calculations.ts

예상 산출물: tests/reading-period.test.ts; 기존 계산 테스트 확장.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 주간·월간 조회와 이동 | 시작·종료일 포함 범위와 표시가 계약에 맞는다 |
| 경계 | 윤년 2/29·월말·연말·한 날짜·빈 라벨 입력 | 경계 전후와 고정 오늘 fallback을 검증한다 |
| 잘못된 입력/실패 | 역전 범위·실제 외부 입력의 잘못된 날짜 | 유효성 검사 지점을 확인하고 계약 미정 항목을 결함/질문으로 남긴다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 시간과 오늘 날짜에 의존하는 결과가 고정 fixture로 재현된다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- TZ=Asia/Seoul npm run test:unit
- TZ=UTC npm run test:unit

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | D01-N01/N02, E01/E02, F01: `tests/reading-period.test.ts`(신규 8개) 및 `tests/reading-calculations.test.ts`(datesInRange/formatDate 4개). Step 02의 runner 발견/실패 전달 증거를 재사용했고, 이번 파일은 unit 컴파일·발견 결과에서 8번째 파일로 확인했다. |
| 실행 명령/결과 | `npm run test:unit`, `TZ=Asia/Seoul npm run test:unit`, `TZ=UTC npm run test:unit` 모두 exit 0; 매 실행 8 파일 PASS, fail/skip/todo 0. |
| 신규 동작/기존 동작 | 로컬 `dateKey`, 포함 범위, 일요일~토요일 주간, 윤년/월말/연말, 주 7일 이동과 month 대상 월 1일, 주/월 라벨·빈 라벨의 고정 오늘 fallback을 명시했다. `formatTime`은 같은 UTC ISO를 현재 TZ의 로컬 HH:MM으로 표시하며 Seoul=09:05, UTC=00:05를 각 환경에서 확인했다. |
| 결함 재현 RED → GREEN | 제품 결함 및 제품 수정 없음; 추가 테스트는 기존 동작 GREEN만 확인했다. |
| 미검증·제외·후속 | 실제 UI `type=date`는 유효 날짜만 제출하고 역전 범위는 `createAssignmentsDb`가 먼저 거부한다. malformed/존재하지 않는 날짜 문자열은 UI 밖 조작 또는 다른 외부 경계에서만 들어오며 helper의 정책이 합의되지 않아 Q01로 유지했고 현재 출력값을 계약으로 고정하지 않았다. DB/RLS·실기기 범위는 해당 없음/기존 제외 유지. |
