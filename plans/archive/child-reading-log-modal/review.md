# Review

## Status

Passed

2026-10-20 viewport 중앙 모달 구현과 자동 검증을 완료했다. Herdr의 `log-tests`와 `log-ui` pane에서 재현·테스트와 UI 구현을 분담하고 Standards·Spec 리뷰를 병렬 진행했다. 실제 모바일 가상 키보드·설치형 PWA는 미검증이다.

## Scope Review

- 사용자 요청인 아동 화면 읽은 책 기록 팝업의 표시 위치에 범위를 한정했다.
- 현재 `dialog open` 렌더링, 관련 CSS, 기존 수기 기록 브라우저 테스트를 확인했다.
- 데이터 규칙, QR 팝업, 다른 화면 변경은 포함하지 않았다.
- 새 도메인 용어와 ADR은 필요하지 않다.

## Planning Verification

- `npm run plan:workflow -- "아동 화면 읽은 책 기록 팝업을 페이지 하단 대신 현재 보이는 화면 위에 표시하도록 개선하는 계획 작성"`: 성공. 범위 경고 없음.
- 계획 문서 구조·UTF-8·상대 링크 검사: 통과. `plan.md`, `review.md`, `tasks/`와 Markdown 5개를 확인했다.
- 코드 변경 전이므로 앱 테스트와 브라우저 재현 결과는 없다.

## Implementation Results

수정 전 위치 회귀 RED를 확인한 뒤 UI를 수정했다. 최종 결과와 미검증 환경은 아래와 같다.

### Task 01 — RED

- 운영 데이터 대신 기존 client HTTP fixture에 24개 과제를 주입했다.
- 팝업 내부 입력이나 버튼을 조작하기 전에 `getBoundingClientRect()`와 viewport, `scrollY`, 문서 높이를 측정했다.
- `npm run test:browser:client -- child-reading-log-dialog.spec.mjs`: 수정 전 360·390·1280px 위치 검사 모두 실패. Chromium 실행 제한으로 발생한 첫 실행 실패는 결함 재현으로 세지 않고, 권한 확장 실행의 실제 assertion 실패로 확인했다.
- 360·390px: 열기 전 `scrollY=0`, 열기 후 `scrollY=5289`, 팝업 `top=392.4375`, `bottom=900.09375` (viewport 높이 900). 문서 높이 5681px.
- 1280px: 열기 전 `scrollY=0`, 열기 후 `scrollY=3291`, 팝업 `top=441`, `bottom=899.65625` (viewport 높이 900). 문서 높이 3733px.
- 1px 허용오차를 적용해도 배경 스크롤 이동과 중앙 표시 검사는 실패한다. `open`만 적용된 문서 하단 dialog의 `autoFocus`가 배경 페이지 이동을 유발하는 실제 결함이다.
- 재현 artifact: `verification-artifacts/browser-1792476858820-665543/report.json`. 1px 허용오차 반영 재확인 보고서: `verification-artifacts/browser-1792476874900-666122/report.json` (3건 실패). 각 폭의 trace·요청 artifact는 `browser-1792476875573-666144`, `browser-1792476877734-666263`, `browser-1792476879664-666379`에 있다.

### Task 02 — 구현

- `app/child-reading-log-dialog.tsx`에 해당 팝업의 JSX와 수명주기를 분리했다. `showModal()`로 열고 닫기·취소·Escape·저장 성공을 React 상태와 연결한다.
- 제목 입력에 초기 포커스를 주고, 정리 시 dialog를 닫으며 기존 루트 overflow를 복원한다. 진입 버튼 포커스는 `preventScroll`로 복원하고 열기 전 페이지 좌표를 유지한다.
- `.quick-log-dialog`에만 고정 중앙 배치, 12px 화면 여백, `vh`/`dvh` 최대 높이, 내부 스크롤과 overscroll 차단을 적용했다.
- 저장 실패 안내를 모달 내부 `role="alert"`로 연결했다. 실패 시 입력값은 유지하며, 열기·재시도 시 이전 오류를 초기화한다. 기존 데이터 계약과 저장 payload는 유지한다.
- UI 담당의 `npm run typecheck`, `npm run check:contracts`, `npm run check:pwa`: 모두 통과.

### Task 03 — 통합 검증 완료

- `npm run verify`: 통과. 계약·service worker 문법·PWA 검사, 단위 테스트 17개 파일, 타입 검사, Next 프로덕션 빌드를 완료했다. 브라우저 회귀는 별도로 실행했다.
- 신규 팝업 브라우저 테스트 11/11 통과. 보고서: `verification-artifacts/browser-1792477124556-670559/report.json`.
- 계획의 관련 5개 파일 회귀 80/80 통과. 보고서: `verification-artifacts/browser-1792477156822-671126/report.json`. skip·예상 밖 실패·flaky 모두 0.
- GREEN 좌표 (viewport 높이 900px): 360·390px에서 `top=196.171875`, `bottom=703.828125`; 1280px에서 `top=220.671875`, `bottom=679.328125`. 모두 중앙에 표시되고 `scrollY=0`을 유지했다.
- 스크롤된 화면 테스트는 진입 버튼이 고정 헤더 아래에서 실제 클릭 가능한지 먼저 확인한다. 고정 헤더에 가린 버튼을 Playwright가 클릭 전 자동 스크롤하는 잘못된 테스트 전제를 보정했다.
- 네이티브 Tab이 브라우저 chrome으로 이동할 때의 `BODY`/`document.hasFocus() === false`를 배경 컨트롤 포커스와 구분했다. 배경 요소의 강제 포커스·포인터 조작·휠 스크롤은 차단된다.
- StrictMode 보완: 기본값이 false인 worker fixture 옵션만 추가했다. 기본 렌더링을 유지하며, 전용 테스트만 `React.StrictMode`로 감싼다. 실제 native close 이벤트가 동일 dialog에 도착한 후에도 모달·제목 포커스가 유지되고, Escape·재열기·페이지 위치·기존 overflow 복원·오류 부재를 검증한다.
- `npm run test:browser:client -- child-reading-log-dialog.spec.mjs --grep StrictMode`: 1/1 통과. 보고서: `verification-artifacts/browser-1792477325673-674252/report.json`.
- 최종 `npm run test:browser:client -- child-reading-log-dialog.spec.mjs parent-report.spec.mjs mobile-layout.spec.mjs camera-upload.spec.mjs child-completion.spec.mjs`: 81/81 통과 (신규 팝업 12개 포함). 보고서: `verification-artifacts/browser-1792477339732-674527/report.json`. skip·예상 밖 실패·flaky 모두 0.
- `node --check tests/browser/support/client-fixture.mjs`, `node --check tests/browser/client/child-reading-log-dialog.spec.mjs`, `git diff --check`: 통과.
- 정상 입력은 기존 아동 수기 저장 payload와 성공 흐름, 경계값은 작은 화면·스크롤·열기/닫기·effect 재실행·unmount, 잘못된 입력은 빈 제목 및 저장 실패로 검토했다. 신규 테스트에는 Given–When–Then 주석을 적용했다.

### Acceptance Criteria 결과

| 시나리오 | 결과와 근거 |
| --- | --- |
| 화면 상단·스크롤된 상태에서 열기 | 통과. 내부 조작 전 좌표 측정, 중앙 표시, `scrollY` 유지 확인. |
| 긴 과제 목록·배경 조작 | 통과. 24개 과제 fixture, 배경 버튼·포커스·휠 스크롤 차단 확인. |
| 360·390·1280px | 통과. 가로 넘침·문구 겹침 없음, 입력·닫기·저장 버튼 hit test 통과. |
| 짧은 화면·모바일 키보드 | 360×320 브라우저 화면 내부 스크롤·버튼 접근 통과. 실제 가상 키보드는 미검증. |
| 닫기·취소·Escape·재열기 | 통과. 진입 버튼 포커스·페이지 위치 복원, 재열기와 초기 포커스 확인. |
| 키보드 조작·팝업 이름 | 통과. 접근 가능한 이름·제목 초기 포커스·양방향 Tab 및 배경 포커스 차단 확인. |
| 정상 저장 | 통과. 기존 owner·child·오늘 날짜·구분·제목·시간 payload 및 성공 안내 확인. |
| 빈 제목·저장 실패 | 통과. 빈 제목 요청 없음, 실패 오류를 모달 안에 표시, 입력 유지·재시도 성공·재열기 확인. |
| 인접 기능 | 최종 81개 관련 회귀 통과. QR 업로드·모바일 배치·아동 과제 완료·부모 보고서와 StrictMode 포함. |
| effect 재실행·unmount | 통과. StrictMode의 실제 close 이벤트 관찰 및 unmount 후 overflow·배경 조작 복원 확인. |

### 미검증 환경

- 실제 모바일 기기에서의 가상 키보드 표시와 입력·저장 버튼 접근은 확인하지 않았다.
- 실제 설치형 PWA와 iOS/Safari에서의 동작은 확인하지 않았다. 모바일 폭 Chromium 검증과 구분한다.
- 배포와 운영 데이터 변경은 수행하지 않았다.

## Code Review

- 기준점: 작업 시작 커밋 `f4f778d7c2f21395961d6837f09e5a64d7733f91`. 리뷰 당시에는 커밋 전이므로 이 기준점 대비 작업 트리 diff와 신규 파일을 함께 검토했다.
- Herdr의 두 pane에서 Standards와 Spec 축을 병렬 검토했다.

### Standards

최종 검토: 조치가 필요한 문서 기준 위반·baseline smell 0건. 모달 수명주기를 전용 컴포넌트로 분리했고, 테스트는 좌표·포커스·입력·저장 결과 등 관찰 가능한 동작을 검증한다. StrictMode fixture·테스트 보완도 검토했다. 최악 이슈 없음.

### Spec

초기 검토: P2 1건 — task 02의 “unmount와 effect 재실행에도 오류가 없다” 중 effect 재실행 경로의 브라우저 검증 누락. 실행 오류가 발견된 것은 아니다.

해결: 기본 렌더를 유지하는 fixture 옵션과 StrictMode 브라우저 회귀를 추가했다. 재검토에서 동일 dialog의 지연 close 이벤트 관찰, 모달·포커스 유지, 종료 후 overflow·scroll·진입 포커스 복원, Escape·재열기 및 오류 부재를 확인했다. 최종 지적 0건, 최악 이슈 없음.

## Promotion Candidates

없음. 새 도메인 개념이나 장기 아키텍처 결정, 운영 규칙 변경이 없어 `docs/CONTEXT.md`, ADR, 하네스 문서로 승격할 항목은 없다.

## Publication and Archive

- 후속 사용자 요청에 따라 구현 커밋 `1ed2e1e`를 `origin/main`에 반영했다.
- 2026-10-20 사용자 요청에 따라 `npm run plan:archive -- "child-reading-log-modal"`로 완료 계획을 아카이브했다. 실제 기기 미검증 항목은 위 기록을 유지한다.
- 이관 후 필수 문서 구조·Markdown 5개의 UTF-8·상대 링크·기존 파일 내용 보존을 확인했고, `git diff --check`와 `npm run check:contracts`가 통과했다.
