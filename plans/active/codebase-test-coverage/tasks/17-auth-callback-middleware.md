# Step 17 — 인증 callback·middleware·서버 페이지

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 3 — 인증과 Next 서버 경계.

## What to Build

인증 code 교환 성공/실패, next redirect 경로·쿼리, no-store 헤더, cookie/추가 헤더 갱신, matcher 제외 경로를 검증한다. 실제 Next 페이지는 로컬 HTTP Auth 대역으로 미설정·비로그인·로그인 분기를 확인한다.

대상 코드:

- app/auth/callback/route.ts
- lib/supabase/middleware.ts
- middleware.ts
- app/page.tsx
- app/auth/error/page.tsx

예상 산출물: tests/server/auth-callback.test.ts; tests/server/auth-middleware.test.ts; tests/browser/auth-routes.spec.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 정상 code·로그인 사용자·세션 갱신 | 같은 origin 내 목표 경로와 cookie/header, 올바른 페이지를 제공한다 |
| 경계 | code 없음·next 없음·이미지/SW 경로 | 오류 경로/기본 경로와 matcher 제외를 확인한다 |
| 잘못된 입력/실패 | 교환 실패·외부/프로토콜 상대 next·cookie 갱신 오류 | 허용 redirect 계약과 오류 처리를 검사하고 실제 결함은 별도로 기록한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] async Page를 DOM에 억지 렌더링하지 않고 실제 Next 서버 요청으로 분기를 확인한다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:server 제안 명령
- test:browser 제안 명령
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 04](./04-browser-harness.md)
- [Step 16](./16-auth-env-clients.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
