# Step 03 — 컴포넌트·hook·서버 테스트 기반

## Status

Complete — 구현·필수 검사 PASS, root Standards/Spec 각 0 findings. 커밋은 root에 인계한다.

## Phase

Phase 0 — 검증 기반과 실행 환경.

## What to Build

Vitest + React Testing Library + DOM 환경을 신규 UI 테스트에 사용하는 작은 호환성 검증부터 한다. Node 서버 환경은 별도 설정으로 나누고 Next navigation·cookies와 Supabase factory를 경계에서 대체한다. async Page 렌더링은 실제 Next 브라우저 검사에 맡긴다. 정확한 버전은 구현 시 Node 22·Next 15·React 19 호환성을 확인해 고정한다.

대상 코드:

- package.json
- tsconfig.test.json
- app/
- lib/supabase/

예상 산출물: tests/components/; tests/hooks/; tests/server/; 전용 테스트 설정.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 작은 컴포넌트 클릭·서버 응답 테스트 | UI callback과 서버 상태·헤더를 각 환경에서 검사한다 |
| 경계 | rerender·unmount·StrictMode | DOM·mock·timer가 다음 테스트로 새지 않는다 |
| 잘못된 입력/실패 | 예상 밖 네트워크·잘못된 mock 환경 | 외부 호출을 차단하고 원인과 함께 테스트를 실패시킨다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] node:test를 전면 이관하지 않고 UI와 서버 테스트가 각각 단독 실행된다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 테스트가 독립 실행되며 실행 발견·실패 전달·환경/대역 정리가 확인된다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- test:component 제안 명령
- test:server 제안 명령
- npm run test:unit
- npm run typecheck

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- [Step 02](./02-unit-runner-fixtures.md)

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 테스트 경로·시나리오 | tests/components/assignment-quiz-score.test.tsx(C02-N01·T01-E07), auth-panel.test.tsx(A04-N01); tests/hooks/lifecycle-harness.test.tsx(T01-E08/E09/E10); tests/server/auth-callback.test.ts(A02-N01/E01·A01 cookie factory 경계); tests/harness/component-server-runner.test.mjs(T01-F04/F05) |
| 실행 명령/결과 | 기본 검사는 TMPDIR=$PWD/verification-artifacts/tmp. 개발 pane test:component exit 0, 3파일·6 test PASS. root test:server 2 PASS, test:unit 110 PASS, node --test tests/harness/component-server-runner.test.mjs 2 PASS: verification-artifacts/step03-{server,unit,probe}.log. 최종 npm run typecheck exit 0: step03-typecheck-final.log. root가 TMPDIR 미지정 동일 probe도 exit 0·2 PASS 확인: step03-default-tmp-probe.log; 기본 /tmp의 의존성 resolve 문제 없음 |
| 신규 동작/기존 동작 | jsdom component/hook·Node server 설정 및 test:component/test:server 추가. React JSX automatic transform으로 별도 React plugin 없이 실제 컴포넌트·NextRequest/NextResponse·SDK factory 경계 검사. 기존 node:test/단위 컴파일 설정·제품 소스는 유지 |
| 결함 재현 RED → GREEN | 제품 결함 수정 없음. 두 의도적 실패 probe는 실제 test 1 failed·원인·nonzero를 확인했다. 최초 server/typecheck는 sandbox mount ENOSPC(exit 101). root 최초 typecheck는 병렬 생성 probe 탐색으로 TS5097(step03-typecheck.log); tsconfig.json.exclude에 verification-artifacts만 추가 후 PASS. 테스트 소스는 typecheck 대상으로 유지 |
| 미검증·제외·후속 | 퀴즈 타입 밖 값 강제 N/A; invalid는 실제 네트워크/환경 경계로 검사. StrictMode test-only hook은 하네스 수명주기 증거이며 제품 요청 hook 완료가 아니다. 실제 DB/RLS·OAuth·async Page·실기기 미검증. phase 0 전체 verify는 Step 04 이후. 기존 next/postcss/sharp audit 3건은 verification-artifacts/step03-audit.json으로 후속 기록, 이번 앱 security upgrade 없음 |

정리: DOM unmount→storage 초기화→timer/spy/global/env 복원 순서로 afterEach를 실행한다. effect 자체 listener/interval 해제와 다음 test의 DOM/storage/env/spy/timer 비상속을 검증한다. 임시 probe는 TMPDIR 아래 test별 디렉터리에서 생성하고 t.after로 삭제하며 CLI env 복사본의 NODE_TEST_CONTEXT만 제거한다. fetch/XHR는 명시 대역 없으면 차단하고 잡아낸 오류도 teardown에서 실패시킨다.
