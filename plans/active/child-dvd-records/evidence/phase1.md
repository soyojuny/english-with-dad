# Phase 1 TDD 검증 기록

## Step 1 — 목록 계약과 조회

- Red: 구현 전 `npm run test:unit` 종료 1. 18개 테스트 파일 중 새 `reading-store-dvd-catalog.test.ts`만 실패. 러너가 개별 실패 원인을 표시하지 않아 누락된 DVD 계약 때문이라는 것은 추정이다. 원본 출력은 실행 환경의 `/tmp/ewd-dvd-step1-red.log`에 남겼다.
- 구현 후 첫 전체 단위 검사: 기존 `reading-drafts`의 초기 데이터 전체 비교가 새 `dvds` 필드 누락으로 실패 1회. 초기 데이터 계약에 맞춰 기대값에 `dvds: []`를 추가했다.
- Green: 신규 DVD 테스트를 컴파일 후 직접 실행해 4개 사례 통과(초기 빈 목록, 빈 조회, 여러 항목 상태 매핑, 책 목록 분리). `npm run test:unit` 18개 테스트 파일 통과. `npm run check:contracts`, `npm run typecheck`, `npm run build` 통과.
- 한계: 전용 테이블과 RLS는 Step 3에서 작업하며 실제 DB 검증은 아직 하지 않았다.

## Step 2 — 추가와 상태 전환

- Red: `tests/reading-store-dvd-write.test.ts` 개별 실행 시 5개 중 4개 실패. 추가·상태 변경 함수가 없어 실패했고 주간 조회 전후 저장 목록 유지 1개는 통과했다.
- Green: `tsc -p tsconfig.test.json --outDir /tmp/ewd-dvd-step2-verify` 후 `env -u NODE_TEST_CONTEXT TZ=Asia/Seoul node /tmp/ewd-dvd-step2-verify/tests/reading-store-dvd-write.test.js` 실행, 5개 모두 통과. 제목 정리·활성 추가, 빈 제목·공백 제목 거부, 양방향 상태 전환과 기존 시청 기록 보존, 주간 조회 후 목록 유지를 확인했다. `npm run typecheck` 통과.
- 한계: 저장소 대역으로 실행했다. 실제 DB·RLS와 부모 화면의 주 변경 상태는 아직 검증하지 않았다.

## Step 3 — DB 소유권 경계

- Red: `node --test tests/harness/dvd-rls-contract.test.mjs`에서 DVD 테이블, RLS 활성화, 소유자 정책이 없어 정적 계약이 실패했다.
- Green: 위 정적 계약 테스트와 `npm run check:contracts`, `npm run build`, `npm run typecheck` 통과. 최초 typecheck는 빌드와 동시에 실행해 `.next/types` 생성 파일 충돌로 1회 실패했고 빌드 종료 후 순차 재실행해 통과했다.
- 실제 DB용 소유자·타인·소유자 위조 테스트는 `tests/db/dvd-rls.sql`로 준비했으나 실행하지 않았다. 이 환경에서 로컬 Supabase CLI, psql, Docker를 찾지 못했다. 정적 검사 통과는 실제 마이그레이션 적용이나 RLS 동작 검증을 뜻하지 않는다. 운영 DB는 변경하지 않았다.

## Step 4 — 중단

- 최초 Red: `npm run test:component -- tests/components/dvd-catalog-flow.test.tsx --reporter=verbose` 실행에서 7개 사례가 실패했다. 부모 화면 사례는 아직 DVD 관리 진입점이 없어 실패했다.
- 중단 사유: 아동 관련 여러 사례에서 테스트의 프로필 선택자가 프로필 카드와 아동 관리 버튼을 모두 찾아 모호해지는 동일한 테스트 오류가 발생했다. 한 번의 테스트 실행에서 같은 원인이 여러 사례에 나타났으며, 사용자 요청의 동일 이슈 2회 이상 실패 기준에 따라 수정·재실행과 Step 4 구현을 중단했다.
- 아동 로딩·실패·빈 목록과 두 아동 공유는 유효한 Red를 확인하지 못했다. Step 4는 미완료이고 `tests/components/dvd-catalog-flow.test.tsx`는 실패 상태의 미커밋 테스트다. 재개 시 테스트 선택자의 의도를 검토해야 한다. 모바일·주간 화면 브라우저 검증과 Phase 1 최종 검증도 미실행이다.

## Step 4 재구성 및 4a — 부모 목록 조회

- 기존 Step 4는 커밋 전이었으므로 잘못된 미추적 테스트만 작업 트리에서 제거하고 `/tmp/ewd-dvd-catalog-flow-step4-stopped.test.tsx`에 보관했다. Step 1~3 커밋은 그대로 유지했다.
- 4a Red: `DEBUG_PRINT_LIMIT=0 npm run test:component -- tests/components/parent-dvd-catalog.test.tsx --reporter=verbose`에서 기존 부모 화면 진입 후 DVD 관리 버튼 부재로 5개 사례가 실패했다. 나머지 상태 assertion에는 도달하지 못했다.
- Green: 위 컴포넌트 테스트 5개, `npm run typecheck`, `npm run check:pwa` 통과. 실제 DB와 모바일 실기기는 미검증이다.

## Step 4b — DVD 추가

- Red: `npm run test:component -- tests/components/parent-dvd-catalog.test.tsx --reporter=verbose`에서 기존 5건 통과, 추가된 4건은 DVD 제목 입력란 부재로 실패했다.
- Green: 같은 컴포넌트 테스트 9건과 `npm run typecheck` 통과. 추가, 빈 제목 거부, 저장 중 중복 방지 및 저장 실패 시 입력 유지·오류 표시를 검증했다.
