# Step 18 — 로그인·로그아웃 UI

## Status

Complete — 컴포넌트 테스트와 실행 증적을 추가했고, 제품 코드는 변경하지 않았다. 최종 Standards 0 findings, Spec 0 findings.

## Phase

Phase 3 — 인증과 Next 서버 경계.

## What to Build

Google OAuth 요청 설정, 로컬 Anonymous 로그인 허용 조건·설명, 오류와 재시도, logout 후 refresh를 사용자 입력으로 검사한다.

대상 코드:

- app/auth-panel.tsx
- app/signed-in-shell.tsx

예상 산출물: tests/components/auth-panel.test.tsx; tests/components/signed-in-shell.test.tsx.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | OAuth 시작·localhost 로컬 로그인·로그아웃 | 맞는 SDK 호출과 router.refresh를 수행한다 |
| 경계 | submitting 상태·로컬 기능 꺼짐·다른 hostname | 버튼 표시/disabled와 로컬 로그인 경계를 확인한다 |
| 잘못된 입력/실패 | SDK 오류·Anonymous disabled·로그아웃 실패 | 읽을 수 있는 안내를 표시하고 실패를 성공 전환으로 오인하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 실제 Google 계정 로그인을 자동 테스트에 요구하지 않고 UI 요청 계약만 확인한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 16](./16-auth-env-clients.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/components/auth-panel.test.tsx` A04-N01/N02/B01/E01–E06, `tests/components/signed-in-shell.test.tsx` A04-N03/E07/E08 |
| 실행 명령/결과 | root `TMPDIR="/home/joon/workspace/english-with-dad/verification-artifacts/tmp" npm run test:component` exit 0; 4 files/17 tests PASS (`verification-artifacts/step18-component-root-final.log`). root 개별 `npm run typecheck`, `npm run check:contracts`, `npm run build`, `git diff --check` 모두 exit 0. Phase 3 경계 root `npm run verify` exit 0 (`verification-artifacts/step18-verify-root-final.log`; `check:contracts`·`check:sw`·`check:pwa`·`test:unit`·`typecheck`·`build`만 포함하며 component/server/browser는 포함하지 않음). |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. Supabase browser factory, router, browser hostname, ReadingManagerClient를 명시 대역해 OAuth/Anonymous/logout UI 요청만 검사한다. |
| 결함 재현 RED → GREEN | 최초 실행은 테스트가 Supabase 공개 env를 독립 설정하지 않고 이 하네스가 제공하지 않는 jest-dom matcher를 사용해 실패했다. 각 테스트 fixture env와 기본 Vitest assertion으로 정정 뒤 GREEN; 제품 결함/제품 수정 없음. |
| 미검증·제외·후속 | 실제 Google/OAuth redirect·session persistence·DB/RLS는 제외한다. jsdom의 hostname 변경은 실제 navigation이 아니라 클릭 시점 `window.location.hostname` 전역 대역으로 제한한다. |
