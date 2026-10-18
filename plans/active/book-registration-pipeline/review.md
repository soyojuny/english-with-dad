# Review

## Status

Draft — 다음 세션용 작업 계약만 작성했다. 앱 코드·DB 스키마·운영 데이터는 변경하지 않았다.

## Plan Conformance

- 사용자는 이번 세션의 실수를 회고하고 등록 파이프라인과 이미지 용량 절감 방안을
  다음 세션에서 깨끗하게 이어갈 문서로 남겨 달라고 요청했다.
- 계획은 구현보다 문제 경계, 확정 결정, 열린 결정, 검증 기준과 인수인계에 집중한다.
- `grill-with-docs`의 목적에 따라 모호한 “완료”를 네 상태로 나누고 로컬 용어를 정의했다.
  Storage 전략이 미정이라 전역 glossary와 ADR은 만들지 않았다.

## Findings

- 현재 저장 경로에는 별도 이미지 등록 API가 없다. 브라우저에서 표지를 압축한 뒤
  Supabase `books.cover`에 data URL을 직접 저장한다.
- `lib/cover-image.ts`의 현재 계약은 긴 변 960px, JPEG 품질 0.72지만 브라우저 canvas
  구현이라 CLI가 그대로 재사용할 수 없다.
- 로컬 Playwright로 브라우저 함수를 실행한 것은 결과 일치를 위한 임시 수단이었으나,
  배치 등록의 안정적인 이미지 처리기로는 부적절하다.
- 최근 등록 표지는 실제로 축소됐지만 해상도·바이트 결과를 저장 직후 사용자에게
  제시하지 않아 원본 저장으로 오인할 수 있었다.
- 단일 배치 명세가 없어 책 순서, URL 필드, 준비 결과와 결과 문서가 서로 어긋날 수 있었다.
- base64 표지를 도구 호출에 싣는 방식은 출력 제한과 부분 전달 위험이 있으므로,
  길이·해시가 확인된 전송 또는 Storage 경로가 필요하다.

## Verification Run

- `npm run plan:workflow -- "AI 자료 등록 파이프라인을 단일 명세 기반으로 정리하고, Playwright 없이 이미지 용량을 줄여 등록하도록 설계한다. 다음 세션용 구현 계획과 검증 기준을 만든다."`: 실행 완료.
- workflow 결과는 `ewd-feature-change`를 권장했고 docs/harness와 코드 범위를 분리하라고 경고했다.
- 코드 확인: `lib/cover-image.ts`, `app/reading-manager-client.tsx`의 표지 입력,
  `lib/supabase/reading-store.ts`의 `saveBook` 경로.
- 구현·운영 DB 쓰기·스키마 변경·테스트 실행은 하지 않았다.

## Known Working Tree State

계획 작성 시점에 아래 기존 변경이 있었다. 다음 세션은 사용자 변경으로 간주하고
덮어쓰기·정리·되돌리기를 하지 않는다.

- `docs/ai-registration-assignment.md`
- `plans/active/ai-registration-assignment/`의 review/task와 신규 결과 JSON 2개
- `plans/active/codebase-test-coverage/`의 문서 변경
- `tests/browser/support/client-fixture.mjs`
- `tests/browser/client/assignment-flow.spec.mjs`

## Promotion Candidates

- 이미지 처리 계약이 확정되면 앱 개발 문서와 등록 스킬에 영구 보존한다.
- Storage 전략을 선택하면 별도 ADR 후보로 검토한다.
