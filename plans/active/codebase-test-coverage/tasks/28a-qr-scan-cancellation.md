# Step 28a — 영상 재생 대기 중 QR 종료 후 스캔 타이머 재생성 방지

## Status

Complete — 사용자가 승인한 guard 1줄을 적용하고 RED → GREEN 및 Step 28 전체 검증을 완료했다.

## Contract

QR 창을 닫거나 컴포넌트를 unmount한 뒤에는 이미 시작한 영상 재생 Promise가
완료되어도 스캔 타이머를 설치하지 않는다. 이미 받은 stream의 track 정지는 기존
effect cleanup이 담당한다.

범위는 `app/reading-manager-client.tsx`의 QR effect에서 `await video.play()` 직후
`cancelled` guard를 추가하는 것이다. 데이터·DB·PWA cache·QR 판독 규칙은 변경하지 않는다.

```diff
 await qrVideoRef.current.play();
+if (cancelled) return;
 setQrState((current) => ({
```

## Verification

1. `M03-E07`에서 재생 Promise 보류 → 창 닫기 → 재생 완료 순서로 진행한다.
2. track 정지 1회, dialog 없음, 미해제 스캔 interval 0개를 확인한다.
3. 같은 경계를 unmount로도 확인하고 Step 28 전체·기존 client 회귀와 typecheck를 실행한다.

## RED Evidence

`verification-artifacts/step28-play-close-red.log`: focused 1 FAIL, exit 1.
dialog는 사라지고 stream은 정지했지만 미해제 interval이 1개 남았다
(`[]` 기대, `[1000000000002]` 관찰). trace·screenshot·requests JSON은 해당 browser artifact에 있다.

`verification-artifacts/step28-play-cancel-red.log`: close/unmount 각각 같은 단언에서
실패해 총 2 FAIL, exit 1이다. 다른 setup/stream/dialog 단언은 통과했다.

## 승인과 구현

2026-10-19 사용자가 최소 guard 수정에 “좋아.”로 승인했다. 요청한 중단 지점은
Step 28 완료 후이며 Step 29 이후는 진행하지 않는다.

`await qrVideoRef.current.play()` 직후 `if (cancelled) return;` 1줄을 추가했다.
기존 effect cleanup이 track을 정지한 뒤 비동기 재생 완료가 타이머를 다시 설치하지 못하게 한다.

`verification-artifacts/step28-play-cancel-green.log`: 동일 M03-E07 close/unmount 각각 PASS,
총 2 PASS, exit 0. setup과 기대 단언을 바꾸지 않고 RED → GREEN을 확인했다.
Step 28 파일 독립 실행 17 PASS (step28-camera-final.log), `npm run verify` exit 0
(step28-verify-final.log)이다. 전체 `npm run test:browser`는 95 ordinary PASS + 기존 출력 취소 expected-fail 1
(summary 96 passed), exit 0 (step28-browser-all-final.log)이다. skip/unexpected/flaky는 0이며
새 expected-fail은 없다. 직접 Standards/Spec 검토는 각각 0 findings다.
