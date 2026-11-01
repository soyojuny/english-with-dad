# Phase 1 TDD 검증 기록

## Step 1 — 목록 계약과 조회

- Red: 구현 전 `npm run test:unit` 종료 1. 18개 테스트 파일 중 새 `reading-store-dvd-catalog.test.ts`만 실패. 러너가 개별 실패 원인을 표시하지 않아 누락된 DVD 계약 때문이라는 것은 추정이다. 원본 출력은 실행 환경의 `/tmp/ewd-dvd-step1-red.log`에 남겼다.
- 구현 후 첫 전체 단위 검사: 기존 `reading-drafts`의 초기 데이터 전체 비교가 새 `dvds` 필드 누락으로 실패 1회. 초기 데이터 계약에 맞춰 기대값에 `dvds: []`를 추가했다.
- Green: 신규 DVD 테스트를 컴파일 후 직접 실행해 4개 사례 통과(초기 빈 목록, 빈 조회, 여러 항목 상태 매핑, 책 목록 분리). `npm run test:unit` 18개 테스트 파일 통과. `npm run check:contracts`, `npm run typecheck`, `npm run build` 통과.
- 한계: 전용 테이블과 RLS는 Step 3에서 작업하며 실제 DB 검증은 아직 하지 않았다.
