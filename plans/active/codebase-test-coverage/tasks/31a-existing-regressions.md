# Step 31a — 기존 expected-fail 결함 최소 수정

## Status

Pending — 수정 범위 승인, 구현 미착수.

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
3. component/server/client browser 관련 suite, contracts/typecheck 및 필요한 build를 순차 실행한다. 실제 DB/RLS/OAuth·실기기는 포함하지 않는다.
4. inventory/scenarios/review에 명령·실제 개수·RED/GREEN artifact와 검토 결과를 기록하고 루트가 별도 커밋한다.

## Execution Record

미실행. Herdr GPT-6.1-Sol·medium pane의 계정 한도 복구 또는 사용자의 명시적인 모델 변경 후 착수한다.
