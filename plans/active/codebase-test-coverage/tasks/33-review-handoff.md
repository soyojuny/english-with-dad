# Step 33 — 계획 대비 리뷰와 후속 인계

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 7 — 하네스와 최종 검증.

## What to Build

전체 파일·핵심 시나리오 담당 결과, 범위 준수, 실행 로그와 제한 사항을 직접 리뷰한다. 이후 사용자가 병렬 리뷰를 요청한 경우에만 subagent를 사용한다. 지속할 테스트 실행/fixture/계층 규칙은 docs로 승격하고 DB/RLS·실기기 후속 확인을 넘긴다.

대상 코드:

- plans/active/codebase-test-coverage/
- docs/testing-guidelines.md
- docs/development-harness.md

예상 산출물: review.md; inventory.md; scenarios.md; follow-up.md.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 모든 필수 자동 시나리오 통과 | 실행 명령과 결과, 최종 파일/시나리오 대응표를 review에 기록한다 |
| 경계 | 환경 제한·적용 불가 입력·발견된 결함 | 후속 이유·조건·예상 검증을 명시해 누락과 구별한다 |
| 잘못된 입력/실패 | 실패 suite·미해결 핵심 계약·계획 밖 동작 변경 | Passed로 표시하지 않고 필요한 별도 수정/결정을 기록한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 후속 실제 DB/RLS·실기기 확인이 남아도 합의한 자동 범위가 충족되면 자동 계획을 Passed로 기록할 수 있다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run verify
- verify:all 제안 명령
- 계획 링크·step 의존성·상태 검사

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 32](./32-verification-gates.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
