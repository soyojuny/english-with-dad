# 단일 배치 명세와 로컬 준비

에이전트가 부모의 사진·책 순서·용도·링크를 해석한 뒤 작성하는 입력이다.
부모에게 JSON 작성을 요구하지 않는다. 앱 코드·업로드 API·DB 스키마는 변경하지 않는다.

## 실행

스킬의 이미지 의존성만 설치한다. 앱 `package.json`과 lockfile은 변경하지 않는다.

```bash
npm ci --prefix .agents/skills/ewd-register-assign/scripts --ignore-scripts
node .agents/skills/ewd-register-assign/scripts/prepare-batch.mjs /tmp/ewd-input/manifest.json /tmp/ewd-prepared
node .agents/skills/ewd-register-assign/scripts/prepare-batch.mjs --check /tmp/ewd-prepared
npm test --prefix .agents/skills/ewd-register-assign/scripts
```

출력 폴더의 부모 경로는 존재해야 하고 출력 폴더는 새 경로여야 한다. 실패/부분 결과를
덮어쓰지 않는다. 잘못된 입력을 고친 경우 새 폴더에 다시 Prepare한다.
이 명령은 이미지와 로컬 파일만 처리하며 네트워크·Supabase·브라우저를 사용하지 않는다.

## 입력

경로는 **명세 파일이 있는 디렉터리 기준**이다. 아래 UUID와 project ref는 예시이며
운영 행이 아니다. 신규 책 ID는 에이전트가 미리 생성하고 기존 책 ID는 소유 조회로 확정한다.
아동 ID와 첫째/둘째 루틴 역할을 혼동하지 않는다. `active: true`는 실제 저장 전 재확인한다.

```json
{
  "schemaVersion": 1,
  "projectRef": "확인한-프로젝트-ref",
  "ownerUserId": "00000000-0000-0000-0000-000000000001",
  "books": [
    {
      "id": "00000000-0000-0000-0000-000000000010",
      "action": "create",
      "active": true,
      "title": "확인한 책 제목",
      "series": "확인한 시리즈",
      "sourceCover": "cover-original.jpg",
      "audio": {
        "listen": "https://example.com/reading?book=10",
        "shadow": "https://example.com/shadow?book=10"
      }
    }
  ],
  "startSunday": "2026-10-11",
  "weeks": 1,
  "bundles": [
    {
      "child": "second",
      "childId": "00000000-0000-0000-0000-000000000002",
      "purpose": "shadow",
      "bookIds": ["00000000-0000-0000-0000-000000000010"]
    }
  ]
}
```

- `books`에는 신규와 재사용 자료를 모두 한 번씩 기록한다. `action: "reuse"`는
  표지 파일이 필요 없고 책 수정 payload도 만들지 않는다. 여러 아동/용도에서 같은
  책을 쓰면 그 ID를 각 `bookIds`에서 참조한다.
- `books` 배열은 등록 검토 순서다. 배정 순서는 각 묶음의 `bookIds`로만 결정한다.
  권수·일요일·1/2주 규칙은 기존 배정 생성기가 검사한다.
- 등록만 요청했다면 `startSunday`, `weeks`, `bundles`를 생략한다.
- `volume`, `level`, `note`, `series`, 사용하지 않는 오디오 필드는 생략하면 빈 값이다.
  링크는 HTTP(S)만 허용하고 쿼리 문자열을 보존한다.
- 읽기 과제에는 `audio.listen`, 정따에는 `audio.shadow`가 필요하다. 잘못된 필드에
  들어간 링크를 자동 이동하거나 빈 필드를 다른 링크로 대체하지 않는다.
- 같은 링크를 두 필드에 넣으려면 공용 링크와 양쪽 용도 합의가 확인된 책에만
  `sharedAudioConfirmed: true`를 둔다. 이 플래그로 과제를 자동 추가하지 않는다.
- 표지 외곽 맞춤은 부모가 맡는다. 준비한 파일 하나를 `sourceCover`로 지정하면 스킬은
  전체 이미지를 압축한다. 배경 자르기·원근 보정·별도 보정본 생성/검토는 수행하지 않는다.
  이전 보정 필드는 지원하지 않으며, 사용자가 맞춘 파일도 `sourceCover`로 입력한다.
- 명세에는 비밀번호·세션 토큰·service-role/secret 키를 넣지 않는다.

## 책별 예외

기본 루틴은 변경하지 않는다. 부모가 해당 책의 활동을 명시한 경우에만 그 묶음의
`overrides`에 기록한다. `taskCounts`는 그 책에 적용할 전체 활동이며 횟수는 1~3이다.
읽기/그림책은 `listen`, 정따는 `listen`/`shadow`/`self`를 허용한다.
퀴즈는 기본값을 따르며 부모가 지정한 경우 `quizEnabled`로 명시한다.

```json
{
  "bookId": "00000000-0000-0000-0000-000000000010",
  "taskCounts": { "shadow": 1, "self": 1 },
  "quizEnabled": false,
  "reason": "부모가 이번 책에는 별도 읽기를 제외하도록 지정"
}
```

위 객체를 해당 묶음의 `overrides` 배열에 넣는다. 링크 유무나 시리즈명만으로
예외를 추정하지 않는다. Prepare는 기본 생성기의 결과에 명시된 예외만 반영한다.

## 이미지 계약과 산출물

로컬 기본값은 JPEG, 최대 긴 변 960px, 품질 72, 흰 배경, 작은 이미지 확대 없음이다.
압축 시 EXIF 방향을 반영하고 출력 메타데이터는 제거한다. 이미지 영역은 자르지 않는다.
흰 배경 합성은 JPEG의 투명 입력 처리이며 사진의 주변 배경을 제거하지 않는다.
원본 입력 상한은 30MiB/60MP이며
빈 파일·잘못된 이미지·다중 프레임 입력은 거부한다. 이 상한은 목표 출력 용량이 아니다.
Sharp와 기존 앱 canvas의 결과는 바이트가 다를 수 있다. 앱의 압축 코드는 수정하지 않는다.

| 파일 | 용도 |
| --- | --- |
| `manifest.json` | 실제 입력 바이트 보존. 원본 사진은 복사·수정하지 않음. |
| `prepared.json` | 책/순서/예외, 루틴 해시, 처리 설정, 입력 표지·압축 결과 메타데이터. |
| `payload.json` | 신규 책과 배정 후보. 표지 data URL을 포함하므로 전체 출력 금지. |
| `report.md` | 전후 해상도·바이트·해시, 날짜별 제목·활동·횟수·퀴즈. |
| `checksums.json` | 위 네 파일의 UTF-8 바이트 길이와 SHA-256. |
| `result.json` | 이후 등록 결과를 에이전트가 기록할 초기 템플릿. |

stdout은 경로·행 수·이미지 메타데이터만 출력한다. 표지의 `processed.sha256`은
JPEG 바이너리 해시이고 `processed.storedCover.sha256`은 **data URL 전체 UTF-8**의
해시다. DB `books.cover`와 비교할 때는 후자를 사용한다.

`--check`는 보존된 명세/산출물의 길이·해시를 검사한다. 입력을 옮기다가 잘리거나
산출물이 달라졌는지 확인하는 용도이며 서명이나 DB 검증은 아니다.
`result.json`은 후속 기록용이므로 checksum 대상에서 제외한다.
수정이 필요한 경우 체크섬을 다시 써서 통과시키지 말고 명세를 고쳐 새로 준비한다.

## 기존 도구로 등록·검증

Prepare 자체는 소유·중복·기간 겹침을 확인하지 않는다. 실제 등록 요청 범위에서:

1. `--check`를 통과한 뒤 대상 프로젝트 ref·부모·아동/책 소유·활성 상태를 조회한다.
   정규화 제목/오디오 URL 중복과 아동/활동/전체 기간의 기존 배정을 확인한다.
   명확한 기존 자료는 재사용하고, 다른 겹침은 부모의 기존 지정에 따라 처리하거나 묻는다.
2. 준비된 `payload.json`의 허용된 신규 행만 기존 Supabase 도구로 저장한다.
   순서/URL/예외를 저장 단계에서 재해석하지 않는다. 앱의 upsert를 그대로 호출하거나
   기존 완료·오디오 실행·퀴즈 기록을 암묵적으로 삭제/교체하지 않는다.
   큰 데이터를 다른 도구에 전달할 때는 [전달 지침](photo-processing.md)을 따른다.
3. 응답이 불명확하면 먼저 재조회하고 확인된 누락만 처리한다. 상태가 여전히
   불명확하면 중단하고 보고한다. 배치 전체를 맹목적으로 재실행하지 않는다.
4. 별도 재조회로 책 필드, 저장 data URL 길이·SHA-256, 배정의 소유/아동/날짜/책/
   활동/과제/횟수/퀴즈를 대조한다. 전체 base64를 보고서로 출력하지 않는다.
5. `result.json`에 실제 생성/재사용 ID와 상태를 기록한다. 초기 배열은 비어 있으며
   후보 ID만으로 생성/재사용 완료를 주장하지 않는다.

상태는 `prepared`(후보 생성), `applied`(허용된 저장 성공), `db_verified`(독립 재조회
일치), `app_verified`(실제 로그인 앱의 표지·할 일·오디오 확인) 순으로 구분한다.
부분 실패/불명확 시 마지막 확인 상태를 유지하고 `unresolved`에 확인된 저장 ID와
미확인 항목을 남긴다. 로그인 접근이 없으면 `appVerification: "pending"`을 유지한다.
실제 DB/로그인 앱 확인은 스킬 개발 테스트에서 수행하지 않는다.
