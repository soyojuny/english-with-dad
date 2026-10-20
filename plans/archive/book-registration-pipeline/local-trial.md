# 실제 사진을 이용한 로컬 준비 시험

## 범위

기존 `ewd-register-assign` 스킬과 로컬 준비 CLI를 시험했다. 실제 책 사진 2장을
입력하되 UUID·아동·프로젝트 ref·링크·활동 예외·배정 날짜는 모두 모의 입력이다.
운영 DB 조회/쓰기와 외부 오디오 재생은 하지 않았다. 이번 시험에서 코드 수정은 없었다.

사진 전체를 입력해 압축과 EXIF 방향을 확인했다. 배경 자르기·원근 보정은 하지 않았으므로
이 결과를 실제 등록용 표지 보정 완료로 간주하지 않는다.

## 실행 결과

- 기존 스킬 테스트 재실행: **49/49 통과**, skip/todo 0.
- 실제 CLI Prepare: 신규 책 후보 2권, 배정 후보 6행, 상태 `prepared`.
- 실제 CLI `--check`: `integrity: verified`.
- 별도 산출물 대조와 실패 입력 시험: **13/13 통과**.
- 범위 밖 기존 파일 134개 해시 일치. 원본 사진 2장도 바이트 길이·해시 일치.

| 사진 | 원본 바이트 | JPEG 바이트 | 저장 data URL 바이트 | 결과 해상도 | JPEG 절감률 |
| --- | ---: | ---: | ---: | --- | ---: |
| Nate the Great | 3,185,924 | 77,747 | 103,687 | 540×960 | 97.56% |
| Nate the Great and Me: The Case of the Fleeing Fang | 3,221,924 | 77,117 | 102,847 | 540×960 | 97.61% |

두 원본의 저장 픽셀은 4000×2252, EXIF orientation은 6이었다. 출력은 세로 540×960
JPEG이고 orientation 메타데이터는 제거됐다. JPEG 바이너리와 저장 data URL 전체의
SHA-256을 각각 독립 계산해 준비 결과와 대조했다. 처리된 표지 2장도 육안으로 확인해
방향과 주요 제목이 유지됨을 확인했다. 원본의 주변 배경은 그대로 남아 있다.

## 배정 대조

책 입력 배열은 Nate the Great → The Case of the Fleeing Fang 순으로 두고,
배정 순서는 반대로 지정했다.

- 2026-10-25~27: The Case of the Fleeing Fang, 정따·스스로 읽기 각 1회 + 퀴즈.
- 2026-10-28~30: Nate the Great, 모의 책별 예외로 읽기·정따·스스로 읽기 각 1회 + 퀴즈.
- 지정 순서를 다시 바꾸면 날짜별 책 배치도 바뀌는 것을 확인했다.
- 등록만 요청한 입력은 신규 책 후보 2권과 배정 0행을 생성했다.

## 독립 확인 13개

- 배열 순서와 다른 지정 배정 순서 보존.
- 기본 정따와 책별 읽기 추가 예외 분리.
- 순서 변경이 날짜별 배정에 반영.
- 등록만 요청하면 배정 없음.
- 실제 사진 EXIF 방향·960px·JPEG/저장 문자열 해시 일치.
- 사진 원본 바이트·해시 보존.
- 정따 링크 누락 거부.
- 책 ID 중복 거부.
- 누락 사진 거부.
- 잘린 JSON 거부·출력 미생성.
- 기존 산출물 덮어쓰기 거부.
- 산출물 변조 감지.
- DB 미저장·앱 미확인 상태 유지.

## 재현 명령과 임시 산출물

```bash
npm test --prefix .agents/skills/ewd-register-assign/scripts
node .agents/skills/ewd-register-assign/scripts/prepare-batch.mjs /tmp/ewd-skill-trial-Aa6nEn/manifest.json /tmp/ewd-skill-trial-Aa6nEn/prepared-new
node .agents/skills/ewd-register-assign/scripts/prepare-batch.mjs --check /tmp/ewd-skill-trial-Aa6nEn/prepared
```

출력 폴더는 새 경로여야 한다. 다음 파일은 이번 세션의 임시 산출물이며 `/tmp` 정리 시 사라질 수 있다.

- 명세: `/tmp/ewd-skill-trial-Aa6nEn/manifest.json`.
- 원본 해시: `/tmp/ewd-skill-trial-Aa6nEn/originals-before.json`.
- 요약: `/tmp/ewd-skill-trial-Aa6nEn/audit-summary.json`.
- 배정 보고서: `/tmp/ewd-skill-trial-Aa6nEn/prepared/report.md`.
- 압축 미리보기: `/tmp/ewd-skill-trial-Aa6nEn/preview-1.jpg`, `preview-2.jpg`.
- 변조 검출용 복제본은 `tampered/`에 격리했고 정상 산출물은 유지했다.

`result.json`은 `prepared` 상태, DB/앱 검증은 `pending`, 실제 생성 ID는 빈 배열이다.
이 결과로 운영 등록·로그인 앱 표시·실제 오디오 재생을 완료했다고 보고하지 않는다.
