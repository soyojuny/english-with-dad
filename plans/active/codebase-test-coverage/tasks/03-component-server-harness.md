# Step 03 — 컴포넌트·hook·서버 테스트 기반

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 0 — 검증 기반과 실행 환경.

## What to Build

Vitest + React Testing Library + DOM 환경을 신규 UI 테스트에 사용하는 작은 호환성 검증부터 한다. Node 서버 환경은 별도 설정으로 나누고 Next navigation·cookies와 Supabase factory를 경계에서 대체한다. async Page 렌더링은 실제 Next 브라우저 검사에 맡긴다. 정확한 버전은 구현 시 Node 22·Next 15·React 19 호환성을 확인해 고정한다.

대상 코드:

- package.json
- tsconfig.test.json
- app/
- lib/supabase/

예상 산출물: tests/components/; tests/hooks/; tests/server/; 전용 테스트 설정.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 작은 컴포넌트 클릭·서버 응답 테스트 | UI callback과 서버 상태·헤더를 각 환경에서 검사한다 |
| 경계 | rerender·unmount·StrictMode | DOM·mock·timer가 다음 테스트로 새지 않는다 |
| 잘못된 입력/실패 | 예상 밖 네트워크·잘못된 mock 환경 | 외부 호출을 차단하고 원인과 함께 테스트를 실패시킨다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] node:test를 전면 이관하지 않고 UI와 서버 테스트가 각각 단독 실행된다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령
- test:server 제안 명령
- npm run test:unit
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
