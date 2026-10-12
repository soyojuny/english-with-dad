# Review

## Status

Passed — 승인된 TDD 구현, step별 검증, Standards/Spec 리뷰를 완료했다. 실제 안드로이드 설치형 PWA와 외부 오디오 앱 전환은 실기기 미접근으로 미검증이다.

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
- 위 항목은 계획 작성 당시 기준이다. 구현 후 검증은 아래 Final Verification에 기록했다.

## Step History

| Phase | Step | Status | RED → GREEN | Commit |
| --- | --- | --- | --- | --- |
| 0 | 00 계약과 pane 구성 | Complete | 문서 step | `0af891b` |
| 1 | 01 조건부 복귀 저장 | Complete | 누락 export RED, 기존 upsert 대입 시 9 assertion 실패 → 31 tests GREEN, contracts/typecheck 통과 | `779a84f` |
| 1 | 02 완료 요청 관리 | Complete | tests-first 컴파일 RED, 행동 assertion RED → 58 tests GREEN, contracts/typecheck 통과 | `940e486` |
| 2 | 03 복귀 이벤트 관리 | Complete | tests-first 컴파일 RED, 신규 26개 중 23개 행동 실패 → 84 tests GREEN, typecheck/contracts/PWA 통과 | `983675f` |
| 2 | 04 화면/배정 복원 | Complete | 정책 테스트 20개 중 17개 RED, 브라우저 4/4 RED → unit 103/103, browser 4/4 GREEN, 타입/계약/PWA 통과 | `69b491b` |
| 3 | 05 최종 검증/조회 지연 복구 | Complete | 리뷰 결함 회귀 3/3 RED, browser 6 PASS/1 RED → unit 106/106, browser 7/7 GREEN, 전체 verify 통과 | 이 기록을 포함한 `fix: recover stalled completion result checks` 커밋 |

## Final Verification

- Herdr 개발 pane `audio-dev` (`wC:p3`)와 테스트 pane `audio-tests` (`wC:p4`)를 분리했다. 개발 담당은 구현, 현재 담당은 테스트 작성/독립 검증/커밋을 맡았다.
- `npm run verify`: exit 0. contracts, SW 구문, PWA 계약, 단위 테스트 106개, typecheck, production build 모두 통과. 최종 로그: `/tmp/ewd-step05-verify.log`.
- 모든 `.test.js`를 발견하는 실행기로 신규 테스트 파일이 실행되었음을 확인했다.
- `npm run test:audio-browser`: 7/7 통과, runtimeErrors 0. 실제 ReadingManagerClient + Supabase HTTP fixture, Chromium 390×844. 최종 로그 `/tmp/ewd-step05-browser-green.log`, JSON/화면 캡처 `/tmp/ewd-audio-smoke-KEasPz/`.
- 브라우저 사례: 배정 선택 재로드 복원, 저장 중 버튼 잠금, 지속 오류 안내, 복귀 응답 지연 중 로컬 시간 사용, 저장 실패 후 같은 요청 재시도, 저장 후 응답 유실의 결과 확인, 결과 조회 지연 후 복구.
- 결과 조회 지연 회귀 RED: unit 103 PASS/3 FAIL (`/tmp/ewd-step05-red.log`), browser 6 PASS/1 FAIL (`/tmp/ewd-step05-browser-first.log`). 구현 전에 실패를 확인했다.
- 운영 계정/데이터, 스키마/RLS, manifest/SW 캐시·설치 규칙 변경 없음. main에서 step별 커밋했으며 push/배포하지 않았다.
- 실제 안드로이드 설치형 PWA, 외부 오디오 앱 전환, 장시간 청취 후 실제 인증 토큰 갱신, 운영 서버에 저장된 결과는 미검증이다. fixture 지연/실패 검증을 실제 보고 증상의 원인 확정으로 해석하지 않는다.

## Standards Review

고정 시작 `15c82a4`, 1차 종료 `69b491b`의 변경을 별도 reviewer가 검토했다. Step 05 추가 변경은 `69b491b` 대비 diff로 재검토했다. 문서화된 규칙 위반이나 조치가 필요한 코드 냄새는 발견하지 못했다. owner_user_id 범위, lib/hook/UI 분리, 한정된 수정 범위가 유지됨을 확인했다.

## Spec Review

같은 고정점과 plan/모든 task를 기준으로 별도 reviewer가 검토했다. 결과 조회가 멈추면 checking에 고정되고 원래 저장 성공도 무시하는 P2 결함 1개를 발견했다. Step 05에서 테스트 3개를 먼저 RED로 만들고, checking의 15초 안내·만료 조회 응답 차단·동일 요청의 늦은 저장 성공 반영을 구현했다. 추가 브라우저 RED/GREEN 및 reviewer 재검토로 해결을 확인했다. 중요한 미해결 코드 결함은 발견하지 못했다.

## Promotion Candidates

- 없음. 새 도메인 규칙이나 장기 보존할 아키텍처 결정은 아직 없다.

## Browser Baseline (Before Step 04)

실제 ReadingManagerClient를 임시 번들로 실행하고 Supabase 요청만 in-memory fixture로 대체했다. Chromium 390×844에서 테스트 코드를 먼저 실행했다. 운영 계정/데이터는 사용하지 않았다.

- RED: 두 번째 배정에서 재로드 후 `1회 완료` 버튼을 찾지 못했다.
- RED: 완료 요청을 지연시켜도 완료 버튼이 활성 상태였다.
- RED: 저장 실패 뒤 3.2초가 지나면 task 영역에 오류 상태가 남지 않았다.
- 브라우저 runtime error는 없었다. 테스트 도구/로그는 `/tmp/ewd-audio-browser/`, `/tmp/ewd-browser-red.log`에 있다.
- 안드로이드 실기기나 실제 오디오 앱 전환을 검증한 결과는 아니다.
- 추가 RED: 복귀 기록 응답을 지연시키고 완료하면 확보한 복귀 시각 대신 기본 시간을 저장했다. 수정 전 브라우저 검증은 총 4개 모두 실패했으며 runtime error는 없었다.
