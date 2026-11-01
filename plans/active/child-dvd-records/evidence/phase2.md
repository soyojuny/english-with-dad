# Phase 2 TDD 검증 기록

## Step 1 — 중단

- 테스트 전용 Codex가 `tests/child-record-time.test.ts`에 기본 30분, 허용 시간과 범위·간격 위반을 검증하는 테스트를 작성했다. 공유 규칙의 이름과 위치는 테스트에서 가정했으며 구현은 아직 없다.
- `test_dir=$(mktemp -d /tmp/ewd-child-time-red.XXXXXX)` 후 `./node_modules/.bin/tsc -p tsconfig.test.json --outDir "$test_dir" && TZ=Asia/Seoul node --test "$test_dir/tests/child-record-time.test.js"`를 실행했다. 컴파일은 완료됐으나 테스트 프로세스는 상세 오류 없이 종료 코드 1을 반환했다.
- `env -u NODE_TEST_CONTEXT TZ=Asia/Seoul node --test /tmp/ewd-child-time-red.g8sgKh/tests/child-record-time.test.js`로 재실행했으나 같은 증상으로 종료 코드 1을 반환했다. 규칙 미구현에 따른 유효한 Red인지는 확인하지 못했다.
- 동일 이슈 2회 실패에 대한 사용자 지정 중단 조건에 따라 추가 실행과 구현을 중단했다. Step 1은 미완료이고 테스트와 이 기록은 미커밋이다. Chromium은 실행하지 않았다.

## Step 1 — 재개 후 중단

- 사용자가 필요한 테스트만 구성하도록 요청했다. 기존 단일 테스트는 시간 선택지와 경계값을 확인하지만, 아직 없는 공유 API의 이름과 위치를 가정한다.
- 테스트 pane이 기존 컴파일 결과를 `env -u NODE_TEST_CONTEXT TZ=Asia/Seoul node /tmp/ewd-child-time-red.g8sgKh/tests/child-record-time.test.js`로 직접 실행해 공유 API가 없어 `undefined`가 나온다는 assertion을 확인했다. 이어 `npm run test:unit`에서도 같은 새 테스트 파일이 실패하고 나머지 19개 파일은 통과했다. 동일한 미구현 API에 따른 실패가 두 번 발생했다.
- 개발 pane에 구현을 지시한 뒤 테스트 pane의 중단 보고를 확인하여 개발을 취소했다. 그 사이 `lib/reading-data.ts`에 시간 규칙이 추가되었으나 검증되지 않은 미완료 변경으로 남아 있다. Green 검증과 커밋은 하지 않았고 Chromium도 실행하지 않았다.

## Step 1 — Green

- 정정: 위의 미구현 API에 대한 두 실패는 예상된 TDD Red이며 개발 실패 중단 조건에 해당하지 않는다. 두 번째 Red 실행은 불필요했다.
- `tsc -p tsconfig.test.json --outDir <임시 디렉터리>` 후 `env -u NODE_TEST_CONTEXT TZ=Asia/Seoul node <임시 디렉터리>/tests/child-record-time.test.js`로 시간 규칙 테스트 1건 통과. `npm run typecheck -- --incremental false` 통과.
- 부모 수기 입력과 기존 데이터에 새 제한을 적용하지 않았다. Chromium은 실행하지 않았다.

## Step 2 — 테스트 준비 오류로 중단

- `tests/components/child-record-book.test.tsx`를 작성한 뒤 `npm run test:component -- tests/components/child-record-book.test.tsx`를 한 번 실행했다.
- 다섯 사례 모두 프로필 선택과 아동 목록의 버튼이 같은 이름으로 검색되는 선택자 오류로 실패해 요구 동작에 도달하지 못했다. 이는 기능 미구현에 대한 의도된 Red가 아니다.
- 같은 예기치 않은 문제의 반복 실패에 대한 사용자 지정 중단 조건에 따라 구현과 추가 실행을 중단했다. 테스트는 미커밋이며 유효한 Red는 확인하지 못했다. Chromium은 실행하지 않았다.

## Step 2 — 기능 우선 구현

- 사용자 요청에 따라 기능을 먼저 구현했다. 책 종류와 제목 입력 및 오늘·현재 아동 저장 흐름을 유지하면서 기록창 이름과 책 탭, 기본 30분부터 90분까지의 시간 선택을 연결했다.
- `npm run check:contracts`, `npm run check:pwa` 통과. 최초 typecheck는 앞서 작성한 미완성 테스트의 타입 오류로 실패했다. 해당 미추적 테스트를 제거한 후 `npm run typecheck -- --incremental false` 통과.
- 기능의 브라우저 동작과 모바일 화면은 확인하지 않았다. Chromium은 실행하지 않았다.
