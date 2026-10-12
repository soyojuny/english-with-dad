# Review

## Status

Pending — 사용자 TDD 구현 승인. Phase 0 계약 작성, Herdr 개발/테스트 pane 분리 완료. 구현 검증 진행 예정.

## Plan Conformance

- 최초 요청은 계획만이었고 이후 사용자가 TDD 구현, Herdr pane 분리, step별 commit을 승인했다.
- 사용자 확인: 안드로이드 설치형 PWA, 완료 클릭 미반영이 최우선, 완료 버튼 미표시도 발생.
- 원인 확정과 취약점 확인을 구별했다. 완료 저장 중복 방지와 복귀 응답 보호만으로 모든 증상이 해결된다고 가정하지 않았다.

## Findings

- 완료 저장의 진행 표시/중복 방지/지속적인 실패 안내가 없다.
- 복귀 이벤트가 중복 요청을 만들 수 있고, 이전 실행의 upsert가 새 실행을 덮어쓸 수 있다.
- 완료 버튼은 복귀 시각이 아니라 배정 선택·실행 기록·미완료 상태에 의존한다.
- PWA 재로드 시 선택한 배정을 보존하지 않아 버튼 소실과 혼동할 수 있다.
- 기존 테스트는 시간 계산만 검사하며 이벤트와 비동기 저장을 검사하지 않는다.
- 네트워크·인증 문제와 실제 UI 재로드는 확인되지 않은 원인 후보이다.

## Verification Run

- `npm run plan:workflow -- "다옹 화면 오디오 듣기 후 복귀 시 완료 체크 간헐적 오류 코드 검토 및 리팩토링 계획만 수립"`: 실행 완료.
- `npm run check:contracts`: 통과.
- `npm run test:unit`: 통과.
- 계획 작성 전 `npm run git:status`: 변경 없음.
- 실제 안드로이드 PWA 재현, 운영 저장 확인, 신규 회귀 테스트, 구현 후 전체 verify: 미실시.

## Step History

| Phase | Step | Status | RED → GREEN | Commit |
| --- | --- | --- | --- | --- |
| 0 | 00 계약과 pane 구성 | Complete | 문서 step | `0af891b` |
| 1 | 01 조건부 복귀 저장 | Complete | 누락 export RED, 기존 upsert 대입 시 9 assertion 실패 → 31 tests GREEN, contracts/typecheck 통과 | `779a84f` |
| 1 | 02 완료 요청 관리 | Complete | tests-first 컴파일 RED, 행동 assertion RED → 58 tests GREEN, contracts/typecheck 통과 | 이 step 커밋; 다음 step에서 해시 기록 |
| 2 | 03 복귀 이벤트 관리 | Pending | 미실행 | — |
| 2 | 04 화면/배정 복원 | Pending | 미실행 | — |
| 3 | 05 최종 검증 | Pending | 미실행 | — |

## Promotion Candidates

- 없음. 새 도메인 규칙이나 장기 보존할 아키텍처 결정은 아직 없다.

## Browser Baseline (Before Step 04)

실제 ReadingManagerClient를 임시 번들로 실행하고 Supabase 요청만 in-memory fixture로 대체했다. Chromium 390×844에서 테스트 코드를 먼저 실행했다. 운영 계정/데이터는 사용하지 않았다.

- RED: 두 번째 배정에서 재로드 후 `1회 완료` 버튼을 찾지 못했다.
- RED: 완료 요청을 지연시켜도 완료 버튼이 활성 상태였다.
- RED: 저장 실패 뒤 3.2초가 지나면 task 영역에 오류 상태가 남지 않았다.
- 브라우저 runtime error는 없었다. 테스트 도구/로그는 `/tmp/ewd-audio-browser/`, `/tmp/ewd-browser-red.log`에 있다.
- 안드로이드 실기기나 실제 오디오 앱 전환을 검증한 결과는 아니다.
