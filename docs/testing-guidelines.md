# 테스트 코드 작성 기준

테스트는 기능의 기대 동작을 명확히 기록하고, 변경 이후에도 그 동작이 유지되는지 검증한다. 새로 작성하거나 수정하는 테스트는 정상 입력, 경계값(edge), 잘못된 입력을 검토하고 Given–When–Then 구조로 작성한다.

## 테스트 케이스 구성

코드를 작성하기 전에 입력 또는 사전 상태와 기대 결과를 정리한다. 기대 결과는 요구사항과 도메인 규칙을 기준으로 정하며, 현재 구현의 결과를 그대로 복사하지 않는다.

| 분류 | 검증 목적 | 케이스 선택 기준 |
| --- | --- | --- |
| 정상 입력 | 유효한 입력에서 의도한 결과가 나오는지 확인 | 대표적인 사용 흐름과 유효한 입력 조합 |
| 경계값(edge) | 동작이 바뀌는 지점에서 규칙이 지켜지는지 확인 | 최솟값·최댓값, 경계 직전·정확한 경계·직후, 빈 목록, 항목 1개, 값 누락 등 |
| 잘못된 입력 | 유효하지 않은 입력이 정해진 방식으로 처리되는지 확인 | 잘못된 형식, 허용되지 않은 값, 범위 밖의 값, 모순되는 상태 등 |

각 기능에서 세 분류의 적용 여부를 검토한다. 빈 값이나 누락된 값은 기능에 따라 유효한 경계값 또는 잘못된 입력이 될 수 있으므로 계약에 따라 분류한다. 잘못된 입력의 기대 결과도 오류 발생, 검증 실패, 기본값 반환 등 실제 계약에 맞게 명시한다. 처리 규칙이 불명확하면 먼저 요구사항을 확인한다.

TypeScript 타입상 전달할 수 없는 값을 단순히 `as any`로 강제하여 케이스를 늘리지 않는다. 외부 입력을 받는 검증 지점에서는 실제로 들어올 수 있는 잘못된 값을 검증한다. 적용할 수 없는 분류는 이유를 리뷰에 남긴다.

예를 들어 `lib/reading-calculations.ts`의 `getLaunchMinutes`는 유효한 실행 시간을 분 단위로 올림하고, 실행 기록이 없거나 시간이 잘못되면 기본 시간을 반환한다.

| 분류 | 입력 또는 상태 | 기대 결과 |
| --- | --- | --- |
| 정상 입력 | 시작 후 2분 1초에 복귀, 기본 시간 10분 | 3분 |
| 경계값 | 시작 후 1밀리초에 복귀 | 1분 |
| 경계값 | 시작 후 정확히 1분에 복귀 | 1분 |
| 경계값 | 시작 후 1분 1밀리초에 복귀 | 2분 |
| 경계값 | 실행 기록 없음 또는 복귀 시각 없음, 기본 시간 10분 | 10분 |
| 잘못된 입력 | 날짜로 해석할 수 없는 시작 시각, 기본 시간 10분 | 10분 |
| 잘못된 입력 | 복귀 시각이 시작 시각과 같거나 더 이른 시각, 기본 시간 10분 | 10분 |

## Given–When–Then 구조

각 테스트 본문에 `// Given`, `// When`, `// Then` 주석을 사용하고 세 단계가 눈에 보이도록 구분한다.

- **Given**: 입력, 사전 상태, 필요한 테스트 대역을 준비한다. 기대 결과는 요구사항에서 정한 값으로 준비한다.
- **When**: 검증 대상의 동작을 실행한다. 하나의 테스트는 하나의 행동 또는 시나리오에 집중한다.
- **Then**: 반환값, 상태 변화, 오류 또는 필요한 부수 효과가 기대와 일치하는지 검증한다.

테스트 이름은 조건과 기대 동작을 설명한다. 예를 들어 `정확히 1분 뒤 복귀하면 1분을 반환한다`처럼 실패 목록만 읽어도 어떤 규칙이 깨졌는지 알 수 있게 작성한다. 한 행동의 결과를 설명하는 여러 assertion은 함께 둘 수 있지만, 독립된 시나리오는 테스트를 나눈다.

현재 프로젝트는 `node:test`와 `node:assert/strict`를 사용한다. 다음은 실제 함수에 대한 세 분류의 작성 예시다. 위 케이스 표 전체를 구현한 예시는 아니다.

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { getLaunchMinutes } from "../lib/reading-calculations";

test("정상 입력: 2분 1초 뒤 복귀하면 3분을 반환한다", () => {
  // Given
  const launch = {
    openedAt: "2026-10-12T10:00:00.000Z",
    returnedAt: "2026-10-12T10:02:01.000Z",
  };
  const fallbackMinutes = 10;

  // When
  const actual = getLaunchMinutes(launch, fallbackMinutes);

  // Then
  assert.equal(actual, 3);
});

test("경계값: 정확히 1분 뒤 복귀하면 1분을 반환한다", () => {
  // Given
  const launch = {
    openedAt: "2026-10-12T10:00:00.000Z",
    returnedAt: "2026-10-12T10:01:00.000Z",
  };
  const fallbackMinutes = 10;

  // When
  const actual = getLaunchMinutes(launch, fallbackMinutes);

  // Then
  assert.equal(actual, 1);
});

test("잘못된 입력: 시작 시각이 잘못된 형식이면 기본 시간을 반환한다", () => {
  // Given
  const launch = {
    openedAt: "invalid-date",
    returnedAt: "2026-10-12T10:01:00.000Z",
  };
  const fallbackMinutes = 10;

  // When
  const actual = getLaunchMinutes(launch, fallbackMinutes);

  // Then
  assert.equal(actual, fallbackMinutes);
});
```

동일한 규칙을 여러 입력으로 검증할 때는 케이스 표를 순회하여 각각의 `test`를 등록할 수 있다. 각 케이스의 이름에는 입력 조건과 기대 동작을 포함하고, 본문은 Given–When–Then 구조를 유지한다. 예외를 기대하는 동기 테스트는 실행을 함수로 감싼 뒤 `assert.throws`로 검증하고, 비동기 테스트는 `await`와 `assert.rejects`를 사용한다.

## 유지보수를 위한 작성 원칙

- 구현의 내부 변수나 호출 순서보다 외부에서 관찰할 수 있는 동작을 검증한다.
- 입력과 기대값은 간결하게 작성하고, 기대값을 대상 함수와 같은 계산으로 다시 만들지 않는다.
- 각 테스트는 독립적으로 실행할 수 있어야 한다. 공유 데이터를 변경하거나 다른 테스트의 실행 순서에 의존하지 않는다.
- 날짜와 시간은 고정한다. 시간 경과가 필요한 동작은 제어 가능한 시계나 테스트 대역을 사용하여 실제 대기를 피한다.
- 단위 테스트의 네트워크와 저장소 의존성은 테스트 대역으로 제어한다. 실제 연동이 필요한 검증은 별도의 통합 또는 브라우저 테스트로 구분한다.
- 버그 수정 시에는 버그를 재현하여 실패하는 테스트를 먼저 작성하고, 수정 후 통과하는지 확인한다.
- 기존 테스트를 전면 재작성하지 않고, 해당 동작을 추가하거나 수정할 때 이 기준을 적용한다.

## 파일 위치와 실행

단위 테스트는 `tests/<대상 모듈>.test.ts`에 작성한다. `lib/`의 순수 로직을 검증하는 경우 해당 모듈의 기존 테스트 파일을 먼저 확인한다.

```bash
npm run test:unit
```

이 명령은 `tsconfig.test.json`으로 TypeScript 테스트를 `.test-build/`에 컴파일하고, `scripts/run-unit-tests.mjs`를 통해 Node 테스트 러너로 실행한다. 생성된 `.test-build/` 파일은 직접 편집하지 않는다.

신규 계층은 기존 node:test와 따로 실행한다. 단위 컴파일에 다른 계층의 테스트를 넣지 않는다.

| 계층 | 실제 경로 | 실행 명령 |
| --- | --- | --- |
| 컴포넌트·hook | tests/components/·tests/hooks/ | npm run test:component (jsdom) |
| 서버 경계 | tests/server/ | npm run test:server (Node) |
| 하네스 발견/실패/정리 | tests/harness/*.test.mjs | npm run test:harness |
| client HTTP 브라우저 | tests/browser/client/*.spec.mjs | npm run test:audio-browser 또는 test:browser:client |
| 실제 Next/Auth HTTP 브라우저 | tests/browser/next/*.spec.mjs | npm run test:browser:next |

`npm run test:browser`는 두 브라우저 프로젝트를 함께 발견한다. UI/서버 mock은 네트워크를
명시 대체하고 test 종료 시 DOM/storage/env/spy/timer를 복원한다. 브라우저는 독립 context를
사용한다. async Page·middleware의 SSR HTTP는 실제 Next와 로컬 HTTP 대역으로 검사하며,
브라우저 route 대체 결과와 구분한다. cache/임시파일/실패 artifact의 경로와 실행 조건은
[개발 하네스](development-harness.md#오디오-완료-화면-회귀-테스트)에 기록한다.

이미지 경계는 `tests/components/cover-image.test.ts`와 `qr-reader.test.ts`에서 제어하고,
`npm run test:browser:client -- qr-image.spec.mjs`는 합성 PNG와 실제 canvas/jsQR로 판독한다.
합성 이미지의 원문과 생성 조건은 `tests/browser/fixtures/README.md`에 기록한다.

`npm run test:browser:client -- camera-upload.spec.mjs`는 실제 QR 파일 판독과 폼 연결,
카메라 권한 오류 및 close/unmount 정리를 검사한다. 카메라·영상 재생은 합성 대역이고
파일 decode·canvas·jsQR는 실제 실행한다. 테스트 bundle의 unmount hook과 브라우저 API 대역은
테스트별 독립 context에만 존재하며 실제 기기 카메라 검증은 후속으로 남긴다.

기능 변경의 전체 검증은 `npm run verify`로 수행한다. UI와 외부 앱 전환 등 브라우저 검증의 범위와 실행 방법은 [개발 하네스](development-harness.md)를 따른다.

## 리뷰 체크리스트

- 정상 입력, 경계값, 잘못된 입력을 검토했고 기대 결과가 명확한가?
- 경계에서 동작이 바뀌면 직전·정확한 경계·직후를 검증했는가?
- 테스트 이름과 Given–When–Then 구조만 읽어도 의도를 이해할 수 있는가?
- 요구사항에 따른 결과를 검증하며 테스트 간 상태나 실행 순서에 의존하지 않는가?
- 관련 테스트가 통과하고, 버그 수정이라면 수정 전 실패도 확인했는가?
