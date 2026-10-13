# Step 29 — 서비스워커 캐시의 실행 동작

## Status

Pending — 계획만 작성했으며 구현하지 않았다.

## Phase

Phase 6 — 이미지·QR·PWA·모바일.

## What to Build

기존 정적 검사를 유지하고 제어된 worker event/caches/fetch로 install·activate·fetch 실행을 검증한다. 실제 Next/browser에서는 manifest 자산과 SW 등록·온라인/오프라인 화면을 확인한다. 새 오프라인 쓰기 기능은 만들지 않는다.

대상 코드:

- public/sw.js
- public/manifest.webmanifest
- scripts/check-pwa.mjs
- app/reading-manager-client.tsx:SW 등록

예상 산출물: tests/harness/service-worker.test.mjs; tests/browser/pwa.spec.ts.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | install·activate·온라인 navigation·캐시 자산 GET | app shell cache 및 현재 fallback 정책을 실행한다 |
| 경계 | 이전 cache 이름·cache miss·POST 요청·offline navigation | 오래된 cache 제거·비GET 처리·현재 root fallback을 확인한다 |
| 잘못된 입력/실패 | cache 준비 실패·fetch 실패·SW 등록 실패 | 실패를 관찰하고 기존 동작의 결함은 별도 기록한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [ ] mock 인증 브라우저는 service worker 차단, PWA 테스트만 별도 context에서 활성화해 요청 대역 간섭을 막는다.
- [ ] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [ ] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [ ] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [ ] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run check:sw
- npm run check:pwa
- test:harness 제안 명령
- test:browser 제안 명령

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)
- [Step 04](./04-browser-harness.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | 미작성 |
| 실행 명령/결과 | 미실행 |
| 신규 동작/기존 동작 | 구현 시 기록 |
| 결함 재현 RED → GREEN | 결함 수정이 승인된 경우에만 기록; 정상 기존 동작은 GREEN 확인 |
| 미검증·제외·후속 | 구현 시 기록 |
