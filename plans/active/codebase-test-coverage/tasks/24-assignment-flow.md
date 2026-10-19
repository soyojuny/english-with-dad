# Step 24 — 배정 생성·갱신·편집·삭제 흐름

## Status

Complete — client HTTP fixture 배정 흐름과 순수 local cache 삭제 상태 전이를 검증했다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

날짜×선택 자료 batch 생성, 활동 구분/횟수/퀴즈, 동일 키 재배정·생성 수 표시, 예정 배정 편집/삭제 UI와 순수 local cache 정리를 각각 검사한다.

대상 코드:

- app/reading-manager-client.tsx:할 일 배정 흐름
- lib/reading-data.ts:삭제 뒤 client-local completion/audio cache 정리

예상 산출물: `tests/browser/client/assignment-flow.spec.mjs`, `tests/reading-data.test.ts`.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 여러 날짜·자료·활동 배정, 퀴즈 전용 편집 | HTTP payload와 아동/예정 화면에 정확한 항목을 반영한다 |
| 경계 | 하루·퀴즈 전용·필사·단어 읽기·영어 그림책·동일 키 갱신·cache key 접두사 이웃 | 브라우저는 자료별 규칙과 중복 없는 UI 병합을, 순수 단위 테스트는 대상 cache key만 정리를 확인한다 |
| 잘못된 입력/실패 | 종료일 역전·아동 없음·활동/횟수 미선택·저장/삭제/PATCH 실패 | 안내하고 잘못된 payload나 성공 상태를 만들지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] DB upsert의 실제 충돌 해소나 cascade는 검증했다고 주장하지 않는다.
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
- [Step 07](./07-materials-candidates.md)
- [Step 14](./14-store-assignment-log-write.md)
- [Step 19](./19-assignment-components.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/browser/client/assignment-flow.spec.mjs`: U02-N01/E01–E03, U03-F01–F04, U04-N01–N04/E01/F01–F03 (16개) UI 흐름; `tests/reading-data.test.ts`: 삭제 local cache 정리 5개 순수 단위 시나리오 |
| 실행 명령/결과 | focused browser 16 PASS (`verification-artifacts/step24-focused-root-final.log`); full client 38 PASS (`verification-artifacts/step24-client-root-final.log`); audio wrapper 7 PASS (`verification-artifacts/step24-audio-root-final.log`). Focused unit은 `./node_modules/.bin/tsc -p tsconfig.test.json && node .test-build/tests/reading-data.test.js`로 5 cases PASS (`verification-artifacts/step24-cache-unit-root-final.log`); `npm run test:unit` 17 files PASS (`verification-artifacts/step24-unit-root-final.log`). `npm run check:contracts`, `npm run typecheck`, `npm run build` PASS (`verification-artifacts/step24-contracts-root-final.log`, `verification-artifacts/step24-typecheck-root-final.log`, `verification-artifacts/step24-build-root-final.log`); `git diff --check` PASS. Phase 5가 Step 26에 끝나므로 `npm run verify`는 실행하지 않았다. |
| 신규 동작/기존 동작 | 제품 동작은 변경하지 않았다. 삭제 상태 전이는 순수 lib helper로 추출해 기존 UI 흐름에 다시 연결했으며, `removeAssignmentFromReadingData`는 배정과 정확한 `assignmentId:` completion/audio cache key만 정리한다. |
| 결함 재현 RED → GREEN | browser fixture의 in-memory cache cascade와 child 재조회는 client-local 정리를 증명하지 못해 제거했다. local cache 정리는 `tests/reading-data.test.ts`의 독립 단위 테스트로 분리했다. |
| 미검증·제외·후속 | 새 제품 결함이나 expected-fail은 없다. U03-F02는 아동 없음에서 자료 선택도 submit도 disabled라 실제 click으로 guard에 도달할 수 없는 documented contract-level unreachable guard다. browser는 실제 DB upsert conflict·cascade·RLS를 검증하지 않으며, 단위 테스트도 client-local 상태 전환만 검증한다. 최종 Standards review와 Spec review는 각각 0 findings였다. |
