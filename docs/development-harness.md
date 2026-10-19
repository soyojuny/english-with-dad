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

### 스크립트 격리 회귀

다음 명령은 개발 스크립트의 성공·거부·경계만 좁게 검증한다.

```bash
env -u NODE_TEST_CONTEXT node --test tests/harness/static-checks.test.mjs tests/harness/plan-scripts.test.mjs tests/harness/git-publish.test.mjs
```

세 파일59개는 contracts/PWA 입력을 임시 복사본에서 변경하고, workflow/archive/git wrapper를
독립 child process로 실행한다. 운영script는 절대경로로 호출하되 cwd는 각 임시fixture다.
`run-unit-tests.mjs`는 import.meta 위치가 기준이므로 기존 `unit-runner.test.mjs`의 복사본 회귀를 재사용한다.
git mutation은 예상argv만 응답하는 fake executable에 한정하며 실제git은 remote없는 temprepo
init/status만 쓴다. archive rename과 cleanup 삭제도 tempfixture 안에서만 수행한다.
각 subprocess는 NODE_TEST_CONTEXT와 상속Git경로 환경을 제거하고 각 fixture는 종료 뒤 부재를 확인한다.
현재 fake executable은 Linux/POSIX용이며 EXDEV/Windows shim/실제remote·DB/RLS는 이 검사의 증거가 아니다.
전체하네스는 `npm run test:harness`가 담당하며 위 focused명령의 통과를 전체suite 통과로 보고하지 않는다.

### 3. 타입 계약

```powershell
npm run test:unit
```

확인 항목:

- 날짜 범위 생성
- 과제 횟수와 완료율 계산
- 오디오 실행 시간 계산
- 조건부 오디오 복귀 저장과 실행 기록 덮어쓰기 방지
- 완료 저장 연타 방지, 응답 유실 후 결과 확인, expected-count 조건부 저장
- 오디오 복귀 이벤트 중복, 로컬 복귀 시각 보관, 이전 실행 응답 배제
- 책 입력 준비 상태와 URL 검증
- 단어 읽기 자료 입력 준비 상태와 QR/URL 검증
- task 정렬과 활동 요약 라벨

`test:unit`은 TypeScript 테스트를 컴파일한 뒤 `scripts/run-unit-tests.mjs`로
`.test-build/` 아래의 모든 `.test.js` 파일을 실행한다. 새 테스트 파일도 실행 대상에
포함되며 Windows/Linux 셸 glob에 의존하지 않는다.

정상 입력·경계값·잘못된 입력의 케이스 구성과 Given–When–Then 작성 규칙은
[테스트 코드 작성 기준](testing-guidelines.md)을 따른다.

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

## 오디오 완료 화면 회귀 테스트

`npm run test:audio-browser`는 실제 `ReadingManagerClient`를 모바일 폭 Chromium에서
실행하고 Supabase HTTP 응답만 테스트 데이터로 대체한다. 운영 계정이나 데이터는 쓰지 않는다.
선택 복원, 저장 중 클릭 차단, 지속적인 오류 안내, 복귀 저장 응답 지연 중 시간 계산,
실패 후 동일 요청 재시도, 응답 유실 후 결과 확인, 결과 조회 지연 후 복구를 검사한다.

도구는 package.json/lock의 exact devDependencies인 `@playwright/test@1.64.0`,
`esbuild@0.28.2`를 사용한다. 별도 임시 npm 설치나 Chromium 실행 파일 지정은 필요하지 않다.
현재 호환성 검증 환경은 Node 22.23.2/Linux이며 Chromium은 Playwright가 관리한다.

```bash
export TMPDIR="$PWD/verification-artifacts/tmp"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/verification-artifacts/playwright-browsers"
export npm_config_cache="$PWD/verification-artifacts/npm-cache"
mkdir -p "$TMPDIR"
# 해당 버전의 Chromium이 없을 때만 다운로드한다.
node node_modules/@playwright/test/cli.js install chromium --no-remove
npm run test:audio-browser
npm run test:browser:next
# 세 프로젝트를 함께 실행한다.
npm run test:browser
```

`test:audio-browser`는 `client-http` 프로젝트에서
`tests/browser/client/audio-completion.spec.mjs`의 오디오 회귀 7개만 실행한다.
`test:browser:client`는 같은 프로젝트의 전체 client suite를 실행한다. esbuild로 실제
ReadingManagerClient를 번들링하고 브라우저의 Supabase HTTP만 대체한다. 이 결과는 실제
Next SSR/Auth 검증이 아니다.

`test:browser:next`는 `next-auth-http` 프로젝트다. app/lib/public과 설정의 임시 복사본에서
실제 Next dev 서버와 middleware/async Page를 실행하고, 서버 SDK도 로컬 Auth HTTP 서버를
호출한다. `.env.local`을 복사하지 않으며 URL/key는 합성 fixture 값이다. 비로그인 SSR HTML과
합성 session cookie 로그인 SSR HTML·서버 Auth 요청을 확인한다. SSR을 page.route로 대체하지
않는다. 실제 Supabase/OAuth/DB/RLS가 성공했다는 의미는 아니다.

운영 URL은 허용하지 않는다. 브라우저는 지정된 loopback origin만 허용하고, client HTTP와
Auth HTTP 대역은 등록한 경로/메서드만 응답한다. Next child의 fetch는 로컬 Auth origin만
허용한다. Next dev의 알려진 npm 버전 확인 요청 한 건은 외부 전송 없이 503으로 대체한다.
다른 요청은 차단하고 catch하더라도 teardown에서 실패한다. 이 guard는 앱의 fetch 경계이며
임의 Node socket의 보안 sandbox를 제공하지 않는다. 기존 `client-http`와 `next-auth-http`는
service worker를 block하고, 별도 `next-pwa` 프로젝트만 allow한다.

`npm run test:browser -- --project=next-pwa`는 `tests/browser/pwa/*.spec.mjs`를 실행한다.
실제 Next/local Auth HTTP fixture와 test별 독립 context에서 manifest/icon 응답, 앱의 SW 등록,
online navigation, 등록 거절 안내를 확인한다. offline은 성공한 shell 준비 뒤 cached root HTML과
precached icon 응답의 증거다. 앱 전체 offline hydration·조작·쓰기, 설치 전 offline 접근,
production build나 Android 설치를 보장하지 않는다. `page.request`는 browser route guard를
우회하므로 manifest/icon의 resolved origin을 로컬 Next origin과 요청 전에 대조하고 redirect를 차단한다.
worker event/cache/fetch 실행은 `node --test tests/harness/service-worker.test.mjs`로 별도 검증한다.

매 명령은 `verification-artifacts/browser-<time>-<pid>/`에 JSON report/요청 attachment를 남기고
실패에는 trace.zip·screenshot·오류 맥락을 보존한다. 서버 시작 실패는 Next 로그와 cleanup.json을
남긴다. 별도 시작 실패 probe에는 브라우저가 없어 trace/화면은 N/A다. Playwright가 test마다
context를 닫고, fixture가 지연 응답을 풀고 HTTP 서버·Next process group·임시 bundle/build를
finally에서 정리한다. 실패 artifact와 버전별 브라우저 cache만 보존한다.

이 검사는 기본 `verify`와 별도다. phase 0 종료에는 verify와 component/server/harness/browser를
함께 실행했다. 당시 browser 두 프로젝트의 독립 실행 증거는 Step 04에, 추가한 PWA 프로젝트의
독립 실행 증거는 Step 29에 기록한다. 실제 안드로이드
설치형 PWA와 외부 오디오 앱 전환 검증은 후속으로 남긴다. [Playwright fixture 수명주기](https://playwright.dev/docs/test-fixtures), [네트워크 대체](https://playwright.dev/docs/network).

## 다음 하네스 후보

- `node --test` 또는 Vitest 기반 순수 로직 테스트
- Supabase CLI/MCP 기반 migration apply/advisors 검증
- Playwright 기반 모바일 smoke test
- QR 스캔 지원 여부를 브라우저별로 기록하는 실기기 체크리스트
- 월간표 출력/PDF 기능 추가 후 snapshot 또는 artifact 검증
