# Step 28 — 카메라·QR 입력 수명주기

## Status

Complete — 카메라·QR 17개 회귀와 승인된 취소 guard 수정, 전체 browser/verify 및 직접 검토를 완료했다.

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

- [x] 카메라 mock/합성 영상 검증과 실제 기기 카메라 검증을 구분한다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:browser 제안 명령
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 04](./04-browser-harness.md)
- [Step 27](./27-cover-qr.md)

## 발견 결함과 별도 수정 범위

`M03-E07`은 `video.play()` 대기 중 창을 닫으면 나중에 스캔 interval이 생성되는 결함을 재현한다.
수정 전 필수 cleanup 계약 실패를 확인한 뒤 사용자 승인으로 최소 guard를 추가했다.
최소 수정 범위와 RED → GREEN 증거는 [Step 28a](28a-qr-scan-cancellation.md)에 기록한다.

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | tests/browser/client/camera-upload.spec.mjs: M03-N01/N02/N03/E01–E07/F01/F02, 17개 |
| 정상 | 실제 QR file의 listen/shadow 대상 분리, 합성 camera QR → listen → shadow 복사, JPEG preview |
| 경계 | blank 프레임/파일, 동일 file input 재시도, 닫기/재오픈, 일반 책 shadow QR → word-reading 유형 전환과 저장 payload, non-URL QR의 native form invalid/no-write |
| invalid·수명주기 | 권한 거부/장치 없음/미지원의 수동 입력·업로드 안내, 파일 decode 실패, late stream close/unmount, 정상 scan unmount, play 대기 중 close/unmount |
| 수정 전 실행 | focused 초기 15 PASS (step28-focused.log); 유형 전환 추가 1 PASS (step28-type-switch.log). M03-E07 최초 1 FAIL (step28-play-close-red.log), 최종 close/unmount 2 FAIL (step28-play-cancel-red.log). `--grep-invert M03-E07` client는 89 ordinary PASS + 기존 U09-F07 expected-fail 1 (step28-client-before-fix.log). 제외 실행을 전체 통과로 계산하지 않았다. |
| 수정 후 실행 | M03-E07 2 PASS (step28-play-cancel-green.log), camera 파일 독립 17 PASS (step28-camera-final.log), `npm run verify` exit 0 (step28-verify-final.log: contracts/SW/PWA/unit 17 files/typecheck/build). `npm run test:browser` exit 0, 95 ordinary PASS + 기존 U09-F07 expected-fail 1 (summary 96 passed), skip/unexpected/flaky 0 (step28-browser-all-final.log). `git diff --check` exit 0. |
| 신규 동작/기존 동작 | 승인된 제품 수정은 play 이후 cancelled guard 1줄이다. test bundle에 실제 React root unmount hook만 추가했다. getUserMedia/play/영상 frame은 대역이며 파일 decode·canvas·jsQR는 실제 실행한다. 실제 Next/Auth 대역과 기존 UI 회귀는 유지한다. |
| 결함 재현 RED → GREEN | Step 28a 사용자 승인 뒤 guard 적용으로 close/unmount 2 FAIL → 2 PASS. 기대 단언은 그대로이며 새 expected-fail/skip은 없다. |
| 독립 실행·정리 | 테스트마다 독립 browser context, 고정 날짜, 제어 Promise/clock을 사용한다. context 종료로 API 대역/DOM/timer를 폐기하며 HTTP server/temp bundle은 fixture finally에서 정리한다. 요청 JSON/실패 trace·화면을 보존한다. 파일 발견/실패 전달은 Step 04와 이번 실제 RED exit 1로 확인한다. |
| 직접 검토·중단 범위 | 기준 ebfe826 대비 Standards 0 findings, Spec 0 findings. 사용자 지시에 따라 subagent 없이 직접 검토했다. Step 28 완료 후 중단하며 Step 29–33은 Pending이다. |
| 미검증·제외·후속 | 실제 카메라/Android/DB/RLS/OAuth는 제외. QR file bitmap.close, track.stop, interval.clear를 관찰했다. QR file 경로는 object URL을 만들지 않고 표지 helper URL cleanup은 Step 27에서 검증했다. |
