# Step 31a — 기존 expected-fail 결함 최소 수정

## Status

Complete — 2026-10-20 승인된 네 제품 최소 수정 및 동일 assertion GREEN, 독립 전체 관련 suite·verify와 최종 검토 완료.

## Approval and Scope

2026-10-19 루트가 기존 결함 네 건의 별도 최소 수정·RED → GREEN을 요청했고 사용자가 “계속해”라고 응답했다.
Step 31 다음, Step 32 최종 gate 전에 수행한다. 제품 수정과 관련 회귀만 변경하며 스키마·새 기능·미확정 Q01–Q05 정책은 추가하지 않는다.

| 계약 | 최소 수정 대상 | 기존 재현 |
| --- | --- | --- |
| 빈 기타학습 편집 폼의 필사/단어 읽기 fallback에는 퀴즈를 표시하지 않는다 | `app/assignment-edit-form.tsx`의 퀴즈 가시성 조건 | `tests/components/assignment-edit-form.test.tsx` D06-E03/E04 |
| 직접 선택도 현재 아동·날짜의 배정으로 제한한다 | `app/use-child-assignment-selection.ts`의 선택 guard | `tests/hooks/use-child-assignment-selection.test.tsx` H01-F05/F06 |
| callback의 protocol-relative next는 `/`로 제한한다 | `app/auth/callback/route.ts`의 경로 검증 | `tests/server/auth-callback.test.ts` A02-B01; 현재 결함은 same-origin 경로이며 외부 open redirect는 아님 |
| 아동 화면 전환 시 대기 중 인쇄를 취소한다 | `app/reading-manager-client.tsx`의 print effect guard/cleanup | `tests/browser/client/parent-report.spec.mjs` U09-F07 |

## Verification

1. 기존 6개 재현을 일반 assertion으로 전환하고 수정 전 nonzero RED를 보존한다. expected-fail 전용 catch/조건부 `test.fail`도 제거해 실제 계약 실패를 관찰한다.
2. 각 계약의 최소 제품 수정 후 동일 assertion의 GREEN을 확인한다. 기존 정상 동작을 유지하고 skip/expected-fail로 실패를 숨기지 않는다.
3. 구현 pane은 component 두 파일/server callback/U09-F07만 순차 실행한다. 전체 suite/typecheck/build는 사용자 지시에 따라 독립 pane이 수행한다. 실제 DB/RLS/OAuth·실기기는 포함하지 않는다.
4. inventory/scenarios/review에 명령·실제 개수·RED/GREEN artifact와 검토 결과를 기록하고 루트가 별도 커밋한다.

## Execution Record

### 루트 독립 검증·최종 검토

component 110 일반 PASS, server 33 일반 PASS, parent-report 16 일반 PASS, verify의 unit 276 PASS와
contracts/SW/PWA/typecheck/build 모두 exit 0이다. expected-fail/skip 0, 독립 및 루트 Standards/Spec
각각 0 findings. `verification-artifacts/step31a-independent-{component,server,parent,verify}.log`에 보존했다.

기준 HEAD는 `26c4295`다. 2026-10-19 일반 assertion으로 여섯 RED를 보존했고 한도 중단 뒤
2026-10-20 같은 모델 설정으로 재개했다. RED 이후 테스트 assertion 변경 없이 네 제품 파일만 수정했다.
`test.fails`/전용 catch/조건부 `test.fail`은 제거한 상태다. U09-F07은 아동 전환 뒤와 부모 복귀 뒤 모두 print 0회를 확인한다.

| 명령 (`env -u NODE_TEST_CONTEXT`로 sandbox 밖 순차 실행) | 수정 전 RED | 수정 후 GREEN | artifact (`verification-artifacts/`) |
| --- | --- | --- | --- |
| `npm run test:component -- tests/components/assignment-edit-form.test.tsx tests/hooks/use-child-assignment-selection.test.tsx` | 18 PASS/4 FAIL, exit1 | 22 PASS, exit0 | `step31a-component-{red,green}.log` |
| `npm run test:server -- tests/server/auth-callback.test.ts` | 5 PASS/1 FAIL, exit1 | 6 PASS, exit0 | `step31a-callback-{red,green}.log` |
| `npm run test:browser:client -- parent-report.spec.mjs --grep U09-F07` | 1 FAIL, exit1 | 1 PASS, exit0 | `step31a-print-{red,green}.log` |

수정은 extraStudy 퀴즈 비표시 조건, 직접 선택의 id/childId/date 일치 조건,
`//next` 기본 경로 제한, print effect의 activeProfile 의존성/부모 이탈 시 요청 취소뿐이다.
기존 timer cleanup이 profile 변경에도 실행되며 복귀 시 요청은 false다. callback 결함은
same-origin 경로 검증 문제였으며 외부 open redirect로 보고하지 않는다.
DB/schema/domain 분리·미확정 Q 정책·새 기능 변경 없음. `git diff --check` PASS.
component의 기존 jsdom requestSubmit 미구현 진단은 남지만 assertion 22개는 모두 PASS다.
전체 suite/typecheck/build/실제 DB/RLS/OAuth/실기기 미실행이며 독립 검증에 인계한다.
commit/push/Step32 착수 없음.
