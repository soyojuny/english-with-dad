# Step 06 — 초기 데이터와 입력 초안 복사

## Status

Complete — 2026-10-14 구현·필수 검사 PASS; 제품 코드는 변경하지 않았다.

## Phase

Phase 1 — 도메인과 순수 로직.

## What to Build

bookToDraft·childToDraft와 빈 초기 데이터의 관찰 가능한 계약을 검증한다. type-only 선언은 typecheck, task/category label과 규칙 대응은 contracts와 행동 테스트로 확인한다.

대상 코드:

- lib/reading-drafts.ts
- lib/reading-data.ts
- lib/reading-types.ts

예상 산출물: tests/reading-drafts.test.ts; 계약 시나리오.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 자료·아동을 초안으로 변환 | 필드가 보존되고 UI에 필요한 값이 있다 |
| 경계 | null 입력·빈 문자열·반복 초안 생성 | 기본값이 맞고 nested audio를 변경해 원본이나 다음 초안을 오염시키지 않는다 |
| 잘못된 입력/실패 | 타입상 불가능한 값 | as any로 인위적 테스트를 만들지 않고 실제 row/폼 경계의 담당 step을 연결한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 새 초안의 audio 참조가 원본 및 다른 초안과 분리되고 타입 계약은 별도 검사에 연결된다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run test:unit
- npm run check:contracts

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | D02-N01/N02/E01. `tests/reading-drafts.test.ts` 5개 test가 Book/Child 편집 필드, null·빈 문자열, 반복 초안 audio 분리, 초기 `ReadingData` shape와 정의/옵션을 검증한다. |
| 실행 명령/결과 | 2026-10-14 `npm run test:unit`, `npm run check:contracts`, `npm run typecheck` 결과는 review.md의 Step 06 실행 기록에 남긴다. |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. singleton `emptyReadingData`는 변경하지 않고 초기 shape만 관찰했다. `emptyBookDraft`도 직접 변경하지 않고 생성한 초안이 nested audio를 공유하지 않음을 확인했다. |
| 결함 재현 RED → GREEN | 기존 동작의 신규 GREEN 계약 확인이다. 제품 결함을 재현하거나 수정하지 않았다. |
| 미검증·제외·후속 | 타입상 불가능한 객체는 `as any`로 만들지 않았다. invalid 폼 입력은 U01, 외부 row 입력은 S01에서 다룬다. Step 02의 unit runner 신규 파일 발견·실패 exit 전달·정리 증거를 재사용한다. DB/RLS·실기기와 Step 07은 범위 밖이다. |
