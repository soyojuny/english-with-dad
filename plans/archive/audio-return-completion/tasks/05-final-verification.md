# Phase 3 / Step 05 — 전체 검증과 리뷰

## What to Build

전체 verify와 가능한 브라우저 검증을 수행하고 시작 기준 커밋부터 Standards/Spec 리뷰를 실행한다. 발견된 결함에는 회귀 테스트를 먼저 추가한다. 실기기 미접근 시 실제 안드로이드 청취가 검증되었다고 선언하지 않는다.

리뷰에서 발견한 결과 조회 지연 결함도 이 step에서 수정한다. 조회가 지연되면 다시 확인할 수 있어야 하고, 원래 저장이 뒤늦게 성공하면 동일 요청의 결과를 반영해야 한다. 만료된 조회 응답이 성공 상태를 덮어쓰거나 추가 저장을 만들지 않도록 테스트한다.

## Acceptance Criteria

- [x] 전체 npm run verify 통과.
- [x] 모든 신규 테스트 파일이 실행됨을 확인.
- [x] Standards/Spec 리뷰에서 중요한 미해결 코드 결함이 없다.
- [x] 브라우저 또는 실기기 검증 결과와 미확인 항목을 정확히 기록한다.
- [x] 각 step의 RED/GREEN 결과와 commit 해시를 review.md에 남긴다.
- [x] 운영 데이터/스키마와 SW 설치·캐시 규칙을 변경하지 않는다.
- [x] 사용자 요청대로 step별 commit을 완료하고 push하지 않는다.

## Required Verification

npm run verify, 가능한 브라우저 UI 검증, plan-aware code-review. 최종 검증 기록을 커밋한다.

## Blocked By

Step 01–04.

## Result

Spec 리뷰 P2 결함을 신규 단위 테스트 3개와 브라우저 조회 지연 사례로 먼저 재현했다. checking에도 15초 안내를 적용하고 만료된 조회를 차단하며 동일 요청의 늦은 저장 성공을 반영했다. unit 106/106, browser 7/7, 전체 verify exit 0. Standards/Spec 추가 리뷰에서 조치가 필요한 결함 없음. 실기기·실제 토큰 갱신·운영 저장은 미확인으로 기록했다. 이 step은 `fix: recover stalled completion result checks`로 커밋한다.
