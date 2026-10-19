# Step 29 — 서비스워커 캐시의 실행 동작

## Status

Complete — worker 15 PASS, 전체 harness 28 PASS, 실제 Next/SW 브라우저 4 PASS, 독립 정적 검사 및 루트 최종 검토 완료.

## Phase

Phase 6 — 이미지·QR·PWA·모바일.

## What to Build

기존 정적 검사를 유지하고 제어된 worker event/caches/fetch로 install·activate·fetch 실행을 검증한다. 실제 Next/browser에서는 manifest 자산과 SW 등록·온라인/오프라인 화면을 확인한다. 새 오프라인 쓰기 기능은 만들지 않는다.

대상 코드:

- public/sw.js
- public/manifest.webmanifest
- scripts/check-pwa.mjs
- app/reading-manager-client.tsx:SW 등록

산출물: `tests/harness/service-worker.test.mjs`; `tests/browser/pwa/service-worker.spec.mjs`; `playwright.config.ts`의 `next-pwa` 전용 프로젝트.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | install·activate·온라인 navigation·캐시 자산 GET | app shell cache 및 현재 fallback 정책을 실행한다 |
| 경계 | 이전 cache 이름·cache miss·POST 요청·offline navigation | 오래된 cache 제거·비GET 처리·현재 root fallback을 확인한다 |
| 잘못된 입력/실패 | cache 준비 실패·fetch 실패·SW 등록 실패 | 실패를 관찰하고 기존 동작의 결함은 별도 기록한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] mock 인증 브라우저는 service worker 차단, PWA 테스트만 별도 context에서 활성화해 요청 대역 간섭을 막는다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

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

진행: Pending → In Progress → Complete (2026-10-19). Step 29만 수행했고 제품 코드는 변경하지 않았다.

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | `tests/harness/service-worker.test.mjs`: P01-N01–N03/E01–E06/F01–F03, 15 tests; `tests/browser/pwa/service-worker.spec.mjs`: P01-B01–B04, 4 tests |
| worker 실행 | `env -u NODE_TEST_CONTEXT node --test tests/harness/service-worker.test.mjs`: exit 0, 15 PASS; `verification-artifacts/step29-worker-focused.log` |
| 실제 Next 실행 | `npm run test:browser -- --project=next-pwa`: exit 0, 4 PASS, 57.8s; `verification-artifacts/step29-browser-focused.log`; 상세 artifact `verification-artifacts/browser-1792400320381-342144/` |
| 독립 검토 수정 후 focused | `env -u NODE_TEST_CONTEXT node --test tests/harness/service-worker.test.mjs`: 15 PASS/exit 0; `npm run test:browser -- --project=next-pwa service-worker.spec.mjs`: 4 PASS/exit 0 (36.0s); `verification-artifacts/step29-worker-focused.log`, `verification-artifacts/step29-browser-focused-final.log`; artifact `verification-artifacts/browser-1792400493264-345194/` |
| 정적 검사 | `npm run check:sw`, `npm run check:pwa`: exit 0; `verification-artifacts/step29-static.log` |
| 발견·실패 전달 | `npm run test:browser -- --project=next-pwa --list`: 1 file/4 tests; `verification-artifacts/step29-discovery.log`. 임시 worker spec의 cache 이름 기대값만 의도적으로 변경한 probe: P01-N01 실패/exit 1, 파일 제거; `verification-artifacts/step29-worker-failure-probe.log` |
| 격리·정리 | 기존 client-http/next-auth-http는 SW block 유지; next-pwa만 allow. 각 test 독립 context/로컬 Next·Auth HTTP 대역; 기존 fixture가 context/server 종료. 각 browser artifact의 `servers/cleanup.json` 4개 모두 temporaryDirectoryRemoved/processExited=true |
| 정상·경계·실패 | install shell 전체, activate 이전/빈 cache, online network-first, GET cache-hit/miss, POST/PUT/DELETE/HEAD 미처리, offline root fallback; cache open/addAll reject, uncached asset fetch reject, 등록 실패 안내. root cache 부재는 유효 Response가 없어 fallback 제공 불가인 경계이며 offline 성공 보장이 아님 |
| 신규 동작/기존 동작 | 제품 변경 없음; test-only VM 대역과 SW 허용 프로젝트 추가. manifest/cache 목록/설치 정책 불변. 예상 산출물 경로만 기존 mjs/project 구조에 맞춤 |
| 결함 재현 RED → GREEN | 새 제품 결함/수정 없음. 의도적 assertion 실패 probe는 하네스 검증이며 제품 RED가 아님. 기존 결함 4종/6 expected-fail은 수정 승인된 Step 31a로 분리; 신규 skip/expected-fail 없음 |
| 환경 | 첫 sandbox browser 실행은 Chromium 시작 권한 오류로 본문 실행 전 실패; 권한 확보 후 같은 suite 4 PASS. NODE_TEST_CONTEXT 상속을 제거한 권한 확보 단일 파일 실행으로 실제 15개 발견/통과를 재확인 |
| 미검증·제외·후속 | offline은 cached root HTML과 precached icon 응답만 확인. Next JS/CSS 전체 precache, full offline hydration/조작/쓰기, 콜드 설치 없는 offline 접근 보장 아님. 개발 Next/local Auth HTTP 경계이며 production build·Android 설치·실제 DB/RLS/OAuth는 미검증 |
| 독립 검증 | 테스트 pane worker 15 PASS 및 전체 harness 28 PASS, fail/skip/todo 0; `verification-artifacts/step29-independent-worker-unsandboxed.log`, `verification-artifacts/step29-independent-harness-unsandboxed.log`; typecheck/contracts/SW/PWA/diff도 exit 0 |
| 최종 검토·인계 | 독립 검토 3 findings 반영 후 루트 직접 Standards/Spec 0/0. build/verify/전체 browser는 이 step에서 미실행. 다음 step은 Codex 계정 한도로 미착수; push/배포 없음 |

독립 검토 finding 반영: N01 fetch/B01 icon HTTP를 When으로 이동, manifest/icon URL origin을 실제 요청 전에 assert 및 redirect 차단. 하네스/테스트 지침은 기존 두 프로젝트 SW block + next-pwa만 allow, offline HTML/icon 증거 범위로 갱신했다. 독립 검증의 초기 sandbox 실행 결과는 개별 테스트 실행 증거로 사용하지 않고 sandbox 밖 재실행의 실제 15/28개 PASS를 사용한다.
