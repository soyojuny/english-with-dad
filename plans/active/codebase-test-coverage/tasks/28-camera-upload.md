# Step 28 — 카메라·QR 입력 수명주기

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 6 — 이미지·QR·PWA·모바일.

## What to Build

getUserMedia·영상 frame·업로드 파일·QR 입력 연결, listen→shadow 복사, dialog 종료/unmount 때 track/interval/object URL 정리를 검증한다.

대상 코드:

- app/reading-manager-client.tsx:QR dialog/camera/file upload 흐름

예상 산출물: tests/browser/camera-upload.spec.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 파일/카메라 QR 판독 후 필드 적용 | 선택한 자료와 listen/shadow 필드에 올바른 값이 입력된다 |
| 경계 | 재오픈·자료 유형 전환·QR 미발견·QR URL 아님 | 잘못된 필드 적용을 방지하고 명시된 안내를 유지한다 |
| 잘못된 입력/실패 | 권한 거부·장치 없음·미지원·파일 decode 실패 | 읽을 수 있는 오류와 수동 입력 경로를 제공하고 자원을 정리한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 카메라 mock/합성 영상 검증과 실제 기기 카메라 검증을 구분한다.
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
- [Step 27](./27-cover-qr.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
