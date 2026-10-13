# Step 23 — 프로필·자료 등록과 관리 흐름

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

실제 ReadingManagerClient + HTTP fixture로 아동 신규/편집·프로필 전환, 일반 책/단어 읽기 등록·편집·검색·준비상태·비활성/복원 흐름을 검증한다. 폼 draft→저장 응답→관리 목록 연결을 확인한다.

대상 코드:

- app/reading-manager-client.tsx:프로필/아동/책 관리 흐름

예상 산출물: tests/browser/profile-material.spec.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 새 아동·책·단어 읽기 자료 저장 | 정리된 값과 유형 규칙이 목록 및 편집 초안에 반영된다 |
| 경계 | 프로필 저장값 없음/손상·빈 목록·미완성 표지/링크·active 전환 | 현재 계약의 안내와 항목 표시를 확인한다 |
| 잘못된 입력/실패 | 필수 필드 누락·잘못된 URL·저장 실패 | 금지 입력은 저장하지 않고 실패한 응답을 성공 목록에 반영하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 실제 DB·파일 Storage 대신 응답 대역을 사용하며 현재 표지는 data URL인 계약을 따른다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 06](./06-drafts-data-contract.md)
- [Step 07](./07-materials-candidates.md)
- [Step 13](./13-store-child-book-write.md)
- [Step 18](./18-auth-ui.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
