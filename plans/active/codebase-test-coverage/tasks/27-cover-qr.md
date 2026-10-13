# Step 27 — 표지 압축과 QR 이미지 판독

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 6 — 이미지·QR·PWA·모바일.

## What to Build

Image/canvas/object URL 경계는 제어 대역으로, QR 실제 판독은 알려진 QR 이미지와 실제 브라우저 canvas로 검사한다. jsQR 자체를 전면 mock한 테스트만으로 QR 읽기 성공을 선언하지 않는다.

대상 코드:

- lib/cover-image.ts
- lib/qr-reader.ts

예상 산출물: tests/components/cover-image.test.ts; tests/components/qr-reader.test.ts; tests/browser/qr-image.spec.ts; 합성 이미지 fixture.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 가로/세로 이미지 압축·정상 QR | 최대 960px·확대 없음·흰 배경 JPEG와 trim된 QR 값을 확인한다 |
| 경계 | 작은 이미지·정사각·0 크기 QR source·QR 없음·반전 QR | 크기/빈 결과/반전 지원을 확인하고 object URL을 정리한다 |
| 잘못된 입력/실패 | 비이미지·이미지 load 실패·canvas context 없음·깨진 이미지 | 명시된 오류/null 계약과 object URL 해제를 검증한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] 브라우저 fixture는 개인정보 없는 합성 이미지이고 압축 품질을 픽셀 완전일치로 고정하지 않는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령
- test:browser 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 03](./03-component-server-harness.md)
- [Step 04](./04-browser-harness.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
