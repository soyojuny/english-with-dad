# Step 16 — 인증 설정과 Supabase client 경계

## Status

Complete

## Phase

Phase 3 — 인증과 Next 서버 경계.

## What to Build

env 조합, development 로컬 로그인 조건, browser/server factory 전달, cookie getAll/setAll과 쓰기 불가 처리를 SDK 대역으로 검증한다. 테스트 종료 시 env와 mock을 복원한다.

대상 코드:

- lib/supabase/config.ts
- lib/supabase/client.ts
- lib/supabase/server.ts

예상 산출물: tests/server/supabase-config.test.ts; tests/server/supabase-clients.test.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 설정값 존재·cookie read/write | 필요한 publishable 설정과 cookie option을 SDK에 전달한다 |
| 경계 | 설정 일부 누락·local flag false·production·cookie 쓰기 불가 | 명시된 오류/노출 조건과 서버 cookie 계약을 따른다 |
| 잘못된 입력/실패 | 잘못된 factory 응답·누락 env | 필요한 실패를 전달하며 테스트가 운영 프로젝트를 호출하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 쿠키 및 SDK 경계 테스트를 실제 세션 갱신·RLS 성공의 증거로 사용하지 않는다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:server 제안 명령
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | A01: `tests/server/supabase-config.test.ts` 14개, `tests/server/supabase-clients.test.ts` 7개. 전체 server suite는 기존 callback 2개를 포함해 23개다. |
| 실행 명령/결과 | root `npm run test:server` exit 0 (3 files/23 tests: 신규 config 14개·clients 7개, 기존 callback 2개; `verification-artifacts/step16-server-root-final.log`), root `npm run typecheck` exit 0, root `npm run check:contracts` exit 0, 개발 pane `npm run build` exit 0, `git diff --check` exit 0. |
| 신규 동작/기존 동작 | 제품 코드·migration·설정·의존성은 변경하지 않았다. 신규 SDK/Next mock 테스트는 factory 인자·반환·throw/rejection, async cookie read, adapter getAll/setAll와 쓰기 불가 경계를 각 한 시나리오로 확인한다. |
| 최종 검토 | Standards review 0 findings, Spec review 0 findings. |
| 결함 재현 RED → GREEN | 제품 결함 없음, 제품 코드 변경 없음. 테스트 fixture의 필수 cookie `options` 누락으로 최초 typecheck가 실패했고 fixture만 보정한 뒤 server/typecheck GREEN을 확인했다. |
| 미검증·제외·후속 | mock은 실제 Supabase/네트워크/운영 프로젝트를 호출하지 않는다. 따라서 실제 Supabase Auth, session refresh, cookie serialization·브라우저 저장, OAuth 및 DB RLS 성공은 미검증이며 Step 17 및 실제 DB/RLS 후속 범위다. `false` 이외 local flag 문자열은 현재 코드의 최소 경계로 `"0"`만 검토했다. |
