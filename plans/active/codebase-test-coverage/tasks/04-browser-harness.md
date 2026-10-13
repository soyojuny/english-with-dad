# Step 04 — 브라우저 fixture와 실제 Next 실행 구분

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

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

- [ ] 클라이언트 번들 검사를 실제 Next E2E로 보고하지 않으며 실패 시 trace·화면·요청 기록을 남긴다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

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
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
