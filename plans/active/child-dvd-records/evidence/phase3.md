# Phase 3 검증 기록

## Step 1 — 읽기·DVD 시간 집계

- 기간별로 필터된 활동 기록에서 DVD와 나머지 시간을 분리 합산한다. 다른 활동과 과거 기록의 시간은 그대로 유지한다.
- `npm run test:unit`, `npm run typecheck`, `npm run check:contracts` 통과. 번들한 계산 함수를 직접 호출해 책 70분·DVD 60분, DVD 60분 두 건의 120분, 과거 DVD 15분과 120분의 135분을 확인했다.
- 기존 테스트는 새 함수를 직접 검증하지 않는다. 아동·주·월 전환 및 화면·PDF 연결은 아직 미검증이다. Chromium은 실행하지 않았다.
