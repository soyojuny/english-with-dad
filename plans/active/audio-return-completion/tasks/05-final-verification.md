# Phase 3 / Step 05 — 전체 검증과 리뷰

## What to Build

전체 verify와 가능한 브라우저 검증을 수행하고 시작 기준 커밋부터 Standards/Spec 리뷰를 실행한다. 발견된 결함에는 회귀 테스트를 먼저 추가한다. 실기기 미접근 시 실제 안드로이드 청취가 검증되었다고 선언하지 않는다.

## Acceptance Criteria

- [ ] 전체 npm run verify 통과.
- [ ] 모든 신규 테스트 파일이 실행됨을 확인.
- [ ] Standards/Spec 리뷰에서 중요한 미해결 코드 결함이 없다.
- [ ] 브라우저 또는 실기기 검증 결과와 미확인 항목을 정확히 기록한다.
- [ ] 각 step의 RED/GREEN 결과와 commit 해시를 review.md에 남긴다.
- [ ] 운영 데이터/스키마와 SW 설치·캐시 규칙을 변경하지 않는다.
- [ ] 사용자 요청대로 step별 commit을 완료하고 push하지 않는다.

## Required Verification

npm run verify, 가능한 브라우저 UI 검증, plan-aware code-review. 최종 검증 기록을 커밋한다.

## Blocked By

Step 01–04.
