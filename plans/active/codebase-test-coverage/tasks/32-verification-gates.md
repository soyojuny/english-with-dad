# Step 32 — 통합 검사와 커버리지 공백 점검

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 7 — 하네스와 최종 검증.

## What to Build

현재 verify를 유지하면서 준비된 component/server/harness를 빠른 검사에 연결하는 비용을 측정한다. browser까지 포함하는 별도 verify:all을 마련한다. 실행되지 않은 원본 파일까지 포함해 커버리지를 보고하며 숫자보다 핵심 시나리오 누락과 미검증 분기를 점검한다. 기존 대비 후퇴 방지는 baseline 측정 후 적용한다.

대상 코드:

- package.json
- tests/
- docs/testing-guidelines.md
- docs/development-harness.md

예상 산출물: 빠른/전체 검사 명령; coverage report; inventory.md/scenarios.md 결과.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 빠른 검사·전체 자동 검사 | 필수 suite 전부가 실제 발견되고 실패가 최종 exit에 전달된다 |
| 경계 | 미import 모듈·단독/전체 실행·고정 timezone 반복 | 0 coverage 모듈과 상태 누출·실행 순서 의존을 드러낸다 |
| 잘못된 입력/실패 | suite 제외·skip/todo·깨진 fixture | 누락을 성공으로 처리하지 않고 해결/제외 이유를 review에 남긴다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 실제 DB/RLS·실기기 미검증을 제외 목록과 함께 보고하며 자동 테스트 완료와 혼동하지 않는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run verify
- verify:all 제안 명령
- test:coverage 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)
- [Step 03](./03-component-server-harness.md)
- [Step 04](./04-browser-harness.md)
- [Step 05](./05-dates-periods.md)
- [Step 06](./06-drafts-data-contract.md)
- [Step 07](./07-materials-candidates.md)
- [Step 08](./08-tasks-progress-logs.md)
- [Step 09](./09-store-full-profile.md)
- [Step 10](./10-store-child-upcoming.md)
- [Step 11](./11-store-parent-period.md)
- [Step 12](./12-store-library.md)
- [Step 13](./13-store-child-book-write.md)
- [Step 14](./14-store-assignment-log-write.md)
- [Step 15](./15-store-completion-audio.md)
- [Step 16](./16-auth-env-clients.md)
- [Step 17](./17-auth-callback-middleware.md)
- [Step 18](./18-auth-ui.md)
- [Step 19](./19-assignment-components.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 21](./21-selection-hook.md)
- [Step 22](./22-task-request-hook.md)
- [Step 23](./23-profile-material-flow.md)
- [Step 24](./24-assignment-flow.md)
- [Step 25](./25-child-completion-flow.md)
- [Step 26](./26-report-manual-log-flow.md)
- [Step 27](./27-cover-qr.md)
- [Step 28](./28-camera-upload.md)
- [Step 29](./29-service-worker.md)
- [Step 30](./30-mobile-layout.md)
- [Step 31](./31-harness-scripts.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
