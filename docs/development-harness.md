# Development Harness

이 프로젝트는 기능 추가보다 먼저 검증 가능한 개발 흐름을 유지한다. AI 에이전트가 반복해서 작업해도 같은 기준으로 판단할 수 있도록, 지침은 `AGENTS.md`, 반복 절차는 `.agents/skills`, 기계 검증은 `scripts/`와 `package.json`에 둔다.

## 기본 원칙

- 사용자가 명시한 내용만 최소 범위로 수정한다. 인접하거나 추가적인 수정이 필요하다고 판단되면 먼저 사용자에게 확인한다.
- 요청이 명확하지 않으면 수정 전에 구체화를 위한 질문을 한다.
- 기능은 `app/reading-manager-client.tsx`에 계속 누적하지 않는다. 가능한 한 orchestration shell로 유지하고, 재사용 가능한 로직은 `lib/`로, 응집도 높은 UI 구역과 dialog는 focused `app/` components로 분리한다.
- 데이터 계약의 기준은 `lib/reading-types.ts`와 `lib/reading-data.ts`다.
- Supabase 변경은 migration, RLS, TypeScript row type, mapper, select/insert/update 코드, 문서를 함께 갱신한다.
- PWA 변경은 `public/manifest.webmanifest`, `public/sw.js`, `scripts/check-pwa.mjs`를 함께 확인한다.
- 루트의 `app.js`, `index.html`, `manifest.webmanifest`, `sw.js`는 ignored legacy/local artifact다. 운영 앱 기준은 `app/`, `lib/`, `public/`이다.
- 강제 수정 명령은 사용하지 않는다. 예를 들어 `npm audit fix --force`는 별도 검토 후 실행한다.

## AI 구성 표면

### `AGENTS.md`

매 세션에 항상 필요한 짧은 repo 규칙만 둔다.

- 프로젝트 구조와 운영 앱 경계
- 변경 규칙
- 검증 명령
- Supabase/PWA 주의사항
- 어떤 repo skill을 사용할지에 대한 라우팅

### `.agents/skills`

반복 작업 절차는 skill로 분리한다.

- `ewd-feature-change`: 일반 기능, 버그 수정, 리팩터링
- `ewd-git-publish`: 반복 git status/commit/push/publish 작업
- `ewd-supabase-change`: Auth, schema, migration, RLS, Storage, persisted data
- `ewd-ui-regression`: PWA, 모바일 UI, QR, 오디오 실행, 브라우저 회귀
- `grill-with-docs`: 큰 작업을 구현 전에 질문으로 구체화하고 용어/결정 문서를 남기는 계획 단계
- `grilling`: `grill-with-docs`가 사용하는 질문 절차
- `domain-modeling`: `grill-with-docs`가 사용하는 `CONTEXT.md`와 ADR 기록 절차
- `implement`: plan task, PRD, issue를 기준으로 구현하는 coding agent 역할
- `code-review`: plan-aware verification agent 역할
- `research`: 구현 전 확인이 필요한 근거 자료를 남기는 선택적 조사 절차

### `plans/`

계획이 필요한 작업은 `docs/`가 아니라 `plans/`에 둔다. `docs/`는 완료 후에도 유지할 아키텍처 문서와 운영 문서의 위치이고, `plans/`는 현재 작업의 계약, task, 검증 기록을 담는 작업 표면이다.

기본 구조:

```text
plans/
  active/
    <slug>/
      plan.md
      review.md
      tasks/
        01-*.md
      research.md
      adr/
        0001-*.md
  archive/
```

실제 plan에서 필수 항목은 `plan.md`, `review.md`, `tasks/`다. `research.md`와 `adr/`는 필요한 경우에만 만든다.

- `plan.md`: `grill-with-docs` 이후 확정된 작업 계약. coding agent와 verification agent가 모두 기준으로 삼는다.
- `tasks/`: coding agent가 수행할 vertical slice 단위 작업.
- `review.md`: verification agent가 plan 대비 구현 결과, 누락, scope creep, 실행한 검증, 승격 후보를 기록한다.
- `research.md`: `/research` 결과처럼 구현 전에 확인한 근거 자료가 있을 때만 둔다.
- `adr/`: 작업 중 생긴 결정 후보를 둔다. 완료 후 장기 보존이 필요한 것만 `docs/adr/`로 승격한다.

완료된 plan은 verification agent가 `review.md`에 통과 상태를 남기고 승격 후보가 처리된 뒤에만 `plans/archive/`로 이동한다.

계획 아카이브는 수동 파일 이동 대신 다음 명령으로 수행한다.

```powershell
npm run plan:archive -- "<slug>"
```

### Git publish policy

이 프로젝트는 기본적으로 `main`에서 작업하고 `origin/main`으로 직접 push한다. 일반 작업에서는 별도 feature branch를 만들지 않는다. 사용자가 명시적으로 브랜치 작업을 요청한 경우에만 새 브랜치를 만든다.

### Subagents

상시 사용하지 않는다. 큰 리뷰나 탐색에서 사용자가 명시적으로 병렬 위임을 원할 때 쓴다.

권장 분리:

- 보안/RLS 리뷰
- UI/PWA 회귀 리뷰
- 테스트 갭/유지보수성 리뷰

## 검증 계층

### 0. 계획 보조

```powershell
npm run plan:workflow -- "<사용자 요청>"
```

확인 항목:

- 요청 키워드 기반 skill 후보
- 현재 변경 파일 기준 범위 경고
- 변경 파일 기준 권장 검증 명령
- 문서/계획 요청 중 코드 변경이 섞였는지 여부

큰 작업에서는 이 보조 출력만으로 구현을 시작하지 않는다. 먼저 `grill-with-docs`로 결정을 구체화하고, `plans/active/<slug>/plan.md`와 `tasks/`에 작업 계약을 남긴 뒤 coding agent가 개발한다. 구현 후 verification agent는 plan-aware `code-review`를 사용해 같은 plan과 task를 spec source로 읽고 `review.md`에 검증 결과를 기록한다.

### 1. 프로젝트 계약

```powershell
npm run check:contracts
```

확인 항목:

- `AGENTS.md`와 repo skills 존재
- 필수 package scripts 존재
- ignored legacy 파일 경계
- reading domain union과 label 정의
- Supabase store가 주요 테이블과 새 계약을 참조하는지
- 초기 migration의 RLS/policy 기본 조건
- `app/reading-manager-client.tsx` `client shell budget` (`120_000` bytes hard limit)
- 대응 기준:
  - Keep `app/reading-manager-client.tsx` as an orchestration shell when practical.
  - Move pure domain or calculation logic into `lib/`.
  - Move cohesive UI sections and dialogs into focused `app/` components.
  - The budget is a final guardrail, not a request to shave bytes locally.

### 2. PWA 계약

```powershell
npm run check:sw
npm run check:pwa
```

확인 항목:

- `public/sw.js` 구문 검사
- manifest 필수 값
- service worker cache 대상 파일 존재
- navigation fallback 유지

### 3. 타입 계약

```powershell
npm run test:unit
```

확인 항목:

- 날짜 범위 생성
- 과제 횟수와 완료율 계산
- 오디오 실행 시간 계산
- 책 입력 준비 상태와 URL 검증
- 단어 읽기 자료 입력 준비 상태와 QR/URL 검증
- task 정렬과 활동 요약 라벨

### 4. 타입 계약

```powershell
npm run typecheck
```

확인 항목:

- Next/React/TypeScript 컴파일 계약
- `lib/reading-types.ts`와 UI/Supabase mapper 간 타입 정합성

### 5. 빌드 계약

```powershell
npm run build
```

확인 항목:

- Next production bundle 생성
- App Router route 수집 및 middleware 빌드

### 6. 브라우저 검증

UI/PWA 작업에서는 자동 검증만으로 충분하지 않다. 변경 범위에 따라 다음을 확인한다.

로컬에서는 Google OAuth 대신 로그인 화면의 `로컬 테스트로 시작`을 사용한다. Supabase Anonymous Sign-Ins와
`20260621210000_anonymous_local_test_profiles.sql` migration이 적용되어 있어야 한다.

- 아동 화면에서 읽기/정따 오디오 링크 열기
- 앱 복귀 후 완료 기록 표시
- 반복 과제 완료 카운트 표시
- PASS/FAIL로 선택한 퀴즈 결과 저장 및 부모 활동 기록 표시
- 할 일 배정에서 퀴즈 Y/N 선택, 기본 N 및 Y 배정만 결과 입력 노출
- 부모 활동 기록은 주간 보기를 기본으로 하고 월간 보기로 전환
- 책 관리에서 표지 사진과 QR 링크 입력
- 자료 관리에서 단어 읽기 QR/URL 입력
- 할 일 배정에서 날짜 범위와 활동 구분별 과제 생성
- 아동 화면에서 기타학습 단어 읽기 완료
- 부모 화면에서 활동표와 시리즈 진행률 확인
- 부모 활동표 기타학습 칸에 단어 읽기 완료 기록 표시
- 모바일 폭에서 버튼/카드/다이얼로그 텍스트 겹침 없음

## 명령

전체 검증:

```powershell
npm run verify
```

이 Windows/NVM 환경에서 `npm`이 PATH에 없으면:

```powershell
C:\nvm4w\nodejs\npm.cmd run verify
```

개별 실행:

```powershell
npm run git:status
npm run git:commit -- "commit message"
npm run git:push
npm run git:publish -- "commit message"
npm run plan:archive -- "<slug>"
npm run check:contracts
npm run check:sw
npm run check:pwa
npm run test:unit
npm run typecheck
npm run build
```

## 다음 하네스 후보

- `node --test` 또는 Vitest 기반 순수 로직 테스트
- Supabase CLI/MCP 기반 migration apply/advisors 검증
- Playwright 기반 모바일 smoke test
- QR 스캔 지원 여부를 브라우저별로 기록하는 실기기 체크리스트
- 월간표 출력/PDF 기능 추가 후 snapshot 또는 artifact 검증
