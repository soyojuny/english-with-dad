# Step 01 — 검증 계약과 전체 코드 목록 확정

## Status

Complete — 2026-10-13 Step 01 문서 구현과 필수 검사 완료. 루트의 Standards·Spec 검토도 모두 통과했다. Step 02는 후속 커밋에서 진행한다.

## Phase

Phase 0 — 검증 기반과 실행 환경.

## What to Build

운영 파일과 공개 함수·사용자 흐름을 목록화하고 각 시나리오에 고유 ID, 기대 결과, 검증 계층, 담당 step을 붙인다. 필수 자동 검증과 후속 실연동 검증을 구분한다.

대상 코드:

- app/
- lib/
- middleware.ts
- public/
- scripts/
- supabase/migrations/

예상 산출물: inventory.md; scenarios.md; review.md.

## Cases to Verify

| 분류 | 입력/상태 | 기대 결과 |
| --- | --- | --- |
| 정상 | 대표 자료 등록→배정→완료→부모 기록 흐름 | 각 행동의 기대 결과와 담당 테스트를 추적한다 |
| 경계 | 빈 데이터·퀴즈 전용 배정·필사·단어 읽기 | 기본 읽기와 다른 규칙을 독립 시나리오로 남긴다 |
| 잘못된 입력/실패 | 계약이 없는 입력·보안 요구 | 현재 구현을 정답으로 고정하지 않고 결정 필요 항목으로 기록한다 |

구현 전에 각 묶음을 작은 시나리오로 나눈다. 적용할 수 없는 입력 분류는 이유를 적고 실제 계약이 불명확하면 현재 구현을 정답으로 고정하지 않는다. 테스트 본문은 Given–When–Then 주석으로 작성한다.

## Acceptance Criteria

- [x] 운영 파일마다 담당 step 또는 검증 제외 이유가 있고, 핵심 시나리오에 기대 결과가 있다.
- [x] 대상 계약과 테스트 경로/시나리오 ID를 inventory.md 및 scenarios.md에 연결했다.
- [x] 기존 관련 회귀를 보존하고 정상·경계·invalid의 적용 여부를 기록했다.
- [x] 런타임 discovery·실패 전달·환경/대역 cleanup의 적용 여부를 기록했다. 이번 step은 문서 작업이므로 N/A이며 런타임 증명은 Step 02–04·31로 넘긴다.
- [x] 필요한 검사를 실행했고 명령·결과·제한을 기록했다.

## Required Verification

- npm run check:contracts

제안 명령은 Phase 0에서 확정·구현한 뒤 사용할 수 있다. fixture 계층에서는 실제 DB/RLS 또는 실기기를 검증했다고 표시하지 않는다. 한 phase 종료 시 기존 npm run verify와 준비된 관련 신규 suite를 함께 실행한다.

## Blocked By

- 해소: 사용자가 전체 계획의 순차 구현과 step별 커밋을 요청했다. 현재 개발 pane에는 Step 01만 전달됐으며 커밋은 루트가 수행한다.

## Execution Record

| 항목 | 기록 |
| --- | --- |
| 상태 전환 | Pending(계획 입력) → In Progress(운영 코드/계약 대조 착수) → Complete(문서 갱신 및 필수 검사 PASS), 2026-10-13. |
| 테스트 경로·시나리오 | inventory.md의 전체 파일/API 책임과 scenarios.md의 43개 ID·정상/edge/invalid·기존 E01~E08·제안 테스트 경로·사례 추적 양식. 신규 테스트 파일 없음. |
| 실행 명령/결과 | npm run check:contracts: exit 0, Contract check passed. python3 /tmp/ewd-step01-document-check.py: exit 0, 문서/파일/API/증거 대조 PASS. 로그: /tmp/ewd-step01-contracts.log, /tmp/ewd-step01-document-check.json. |
| 신규 동작/기존 동작 | 제품 동작 변경 없음. app 15/lib 15/scripts 7/public 9/migration 13개·middleware/루트 설정, 런타임 export 102개·타입 export 30개를 대조. 기존 6개 unit 파일(93개 선언)/7개 audio run 보존. |
| 결함 재현 RED → GREEN | N/A: 제품 결함 재현/수정을 수행하지 않았다. owner 전체 이력 scope 등 문서 오기를 정정했고 Q01~Q05는 미확정 입력 경계로 기록했다. |
| 미검증·제외·후속 | 새 런타임 test discovery/실패 exit/fixture·DOM·storage·env·listener·timer cleanup은 N/A: 런타임 코드/러너/fixture를 추가·수정하지 않았고 관련 자원을 만들지 않았다. 문서 대조만 독립 실행했다. 후속 Step 02–04·31에서 실제 증명한다. verify/typecheck/build/unit/browser 재실행 없음; DB/RLS·실기기·OAuth 제외 유지. |
| 검토·커밋 인계 | 사용자 지침에 따라 두 축 code-review와 commit은 루트 담당. fixed point 질의·agent 생성·Herdr 조작·commit/push 없음. 승인/네트워크/파일 권한이 필요한 실행 없음. |
