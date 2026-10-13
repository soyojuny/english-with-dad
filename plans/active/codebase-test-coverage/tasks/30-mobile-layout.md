# Step 30 — 모바일 레이아웃과 접근 가능한 조작

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 6 — 이미지·QR·PWA·모바일.

## What to Build

360/390px 모바일과 데스크톱에서 주요 카드·폼·dialog·활동표, 긴 한국어 제목/자료명과 오류 안내·키보드 조작을 확인한다. 실제 앱 구동 후 DOM 크기/버튼 접근을 중심으로 검사하고 화면 캡처는 보조 증거로 쓴다.

대상 코드:

- styles.css
- app/layout.tsx
- app/reading-manager-client.tsx
- public/manifest.webmanifest

예상 산출물: tests/browser/mobile-layout.spec.ts; follow-up.md 실기기 체크리스트.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 모바일에서 등록→배정→완료·dialog 조작 | 주요 버튼과 안내를 클릭·읽을 수 있고 문서 전체가 불필요하게 넘치지 않는다 |
| 경계 | 긴 제목·최대 횟수·많은 자료·가로 스크롤 활동표 | 의도된 표 스크롤과 전체 화면 잘림을 구분한다 |
| 잘못된 입력/실패 | 오류 문구·권한 거부 상태·좁은 viewport | 오류와 재시도 버튼이 겹치거나 가려지지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] Android 설치·실제 카메라·외부 오디오 앱 복귀는 자동 완료 gate에서 제외하고 후속 항목으로 남긴다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run check:pwa

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 19](./19-assignment-components.md)
- [Step 20](./20-feedback-report-components.md)
- [Step 23](./23-profile-material-flow.md)
- [Step 24](./24-assignment-flow.md)
- [Step 25](./25-child-completion-flow.md)
- [Step 26](./26-report-manual-log-flow.md)
- [Step 28](./28-camera-upload.md)
- [Step 29](./29-service-worker.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
