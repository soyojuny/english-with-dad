# Step 23 — 프로필·자료 등록과 관리 흐름

## Status

Complete — 최종 Standards/Spec review는 각각 0 findings이며, 필수 검증을 완료했다.

## Phase

Phase 5 — 사용자 흐름 회귀.

## What to Build

실제 ReadingManagerClient + HTTP fixture로 아동 신규/편집·프로필 전환, 일반 책/단어 읽기 등록·편집·검색·준비상태·비활성/복원 흐름을 검증한다. 폼 draft→저장 응답→관리 목록 연결을 확인한다.

대상 코드:

- app/reading-manager-client.tsx:프로필/아동/책 관리 흐름

예상 산출물: `tests/browser/client/profile-material.spec.mjs`.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 새 아동·책·단어 읽기 자료 저장 | 정리된 값과 유형 규칙이 목록 및 편집 초안에 반영된다 |
| 경계 | 프로필 저장값 없음/손상·빈 목록·미완성 표지/링크·active 전환 | 현재 계약의 안내와 항목 표시를 확인한다 |
| 잘못된 입력/실패 | 필수 필드 누락·잘못된 URL·저장 실패 | 금지 입력은 저장하지 않고 실패한 응답을 성공 목록에 반영하지 않는다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 실제 DB·파일 Storage 대신 응답 대역을 사용하며 현재 표지는 data URL인 계약을 따른다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- `TMPDIR=$PWD/verification-artifacts/tmp PLAYWRIGHT_BROWSERS_PATH=$PWD/verification-artifacts/playwright-browsers npm run test:browser:client`
- `TMPDIR=$PWD/verification-artifacts/tmp PLAYWRIGHT_BROWSERS_PATH=$PWD/verification-artifacts/playwright-browsers npm run test:audio-browser`
- `npm run typecheck`
- `npm run check:contracts`
- `npm run build`
- `git diff --check`

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
| 테스트 경로·시나리오 | `tests/browser/client/profile-material.spec.mjs`: U01-N01–N05(정상 5), U01-E01–E05(경계 5), U01-F01–F05(invalid/failure 5), focused 15개. 이전 계획의 `tests/browser/profile-material.spec.ts` 표기는 확정된 client-http project 및 `.mjs` 규칙으로 교정했다. |
| 실행 명령/결과 | focused profile/material 15 PASS (`verification-artifacts/step23-focused-root-final.log`); full client HTTP 22 PASS (`verification-artifacts/step23-client-root-final.log`); audio-only wrapper 7 PASS (`verification-artifacts/step23-audio-root-final.log`); typecheck PASS (`verification-artifacts/step23-typecheck-root-final.log`); contracts PASS (`verification-artifacts/step23-contracts-root-final.log`); build PASS (`verification-artifacts/step23-build-root-final.log`); `git diff --check` PASS. `npm run verify`는 Phase 5 종료가 아니므로 미실행. |
| 신규 동작/기존 동작 | 제품 코드는 변경하지 않았다. `client-fixture.mjs`에 profile/material test별 in-memory REST 상태·body 기록·failure toggle을 추가하고, path/method별 허용 query key/operator를 명시 검증하며 query entries 배열로 중복 값을 보존했다. 기존 audio fixture와 7개 spec은 변경하지 않았고 wrapper는 audio spec 경로를 명시한다. |
| 결함 재현 RED → GREEN | 신규 제품 결함이나 expected-fail은 없다. 리뷰 findings에 따라 초기 로딩 뒤 손상 storage fallback·정리와 표지/읽기/정따 링크 누락의 독립 edge, 준비 상태, invalid 입력과 HTTP 실패를 분리했고, fixture의 실제 assignments child/date `eq` query를 허용 목록에 추가한 뒤 focused 15 PASS를 확인했다. |
| 최종 리뷰 | Standards review 0 findings; Spec review 0 findings. |
| 미검증·제외·후속 | data URL 표지는 REST row 전달과 img 표시만 확인한다. 실제 Storage 업로드, DB/migration/RLS, Auth, 실제 카메라/QR 및 실기기는 이 HTTP fixture 범위 밖이며 Step 27–28 또는 후속 실연동 검증 대상이다. |
