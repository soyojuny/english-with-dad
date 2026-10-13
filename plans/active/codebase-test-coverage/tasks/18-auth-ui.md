# Step 18 — 로그인·로그아웃 UI

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

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

- [ ] 실제 Google 계정 로그인을 자동 테스트에 요구하지 않고 UI 요청 계약만 확인한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

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
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
