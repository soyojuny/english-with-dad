# Review

## Status

Complete

스킬 전용 범위로 수정하고 구현·로컬 검증 완료.
운영 책 등록·DB 검증·실제 로그인 앱 검증을 수행한 상태는 아니다.

## Scope Correction

최초 계획은 앱/CLI 공용 처리기와 서버 API/Server Action까지 포함해 사용자의 의도보다
넓었다. 사용자가 이번 작업은 시스템 개발이 아니라 스킬 등록·보강이라고 정정했다.
앱 코드·API·DB 스키마·Storage·동시성/재시도 시스템을 제외하고 계획과 작업 문서를
모두 수정했다. 운영 데이터 쓰기와 Git commit/push도 이번 작업에서 하지 않았다.

변경 범위는 `.agents/skills/ewd-register-assign/`, 이 계획,
`docs/ai-registration-assignment.md`다. 기존 배정 생성기·QR 도구 코드는 수정하지 않았다.

## Implementation

- `scripts/process-cover.mjs`: 로컬 Sharp로 JPEG/최대 960px/품질 72 변환.
  EXIF 방향, 흰 배경, 비율·확대 방지, 출력 메타데이터 제거를 적용한다.
  30MiB/60MP 상한을 두고 원본은 읽기만 한다.
- `scripts/prepare-batch.mjs`: 단일 명세를 검증하고 기존 배정 생성기를 호출한다.
  명시된 순서와 책별 활동 예외만 반영한다. 등록만 요청한 경우 배정을 만들지 않는다.
- `manifest.json`, `prepared.json`, `payload.json`, `report.md`, `checksums.json`과
  후속 운영 기록용 `result.json`을 새 출력 폴더에 생성한다.
  base64는 로컬 payload에만 보관하고 stdout에는 요약을 출력한다.
  `--check`로 네 불변 산출물의 길이·해시를 대조한다.
- Sharp는 스킬 `scripts/package.json`과 lockfile에 고정했다. 앱의 의존성은 그대로다.
- 스킬·사진 참조·새 배치 참조·운영 문서에 기존 도구를 이용한 소유/중복/겹침 확인,
  불명확 시 재조회·누락만 처리·미확인 시 중단, 독립 필드/표지 해시 비교를 기록했다.
  새 저장 서비스나 자동 재시도는 구현하지 않았다.
- `prepared/applied/db_verified/app_verified`를 구분하고 실제 저장 ID와 앱 확인을
  후속 등록 요청 때 기록하도록 했다. Prepare는 소유 확인이나 DB 저장 완료를 주장하지 않는다.

## Contract Evidence

`lib/cover-image.ts`의 기존 상수는 960px와 0.72이며 흰 배경과 확대 방지를 사용한다.
이를 로컬 기본값으로 유지했다. Sharp와 canvas의 바이트 일치를 주장하지 않는다.
`lib/supabase/reading-store.ts`의 현재 `books.cover` 문자열 저장 계약도 유지한다.

처음 계획의 운영 DB 용량 조사·모바일 표시 크기 측정·720px/WebP 비교·80~120KB 목표는
앱/저장 최적화로 범위를 넓히므로 이번 작업에서 제외했다. 실제 처리 전후 해상도·바이트·
해시는 배치마다 기록한다. 현재 검증은 합성 fixture 기준이며 실제 책의 가독성을
검증했다고 주장하지 않는다.

## Verification Run

- `npm run plan:workflow -- "책 등록 스킬과 로컬 실행 도구만 안정화한다. 앱 코드 API DB 스키마 운영 데이터는 변경하지 않고 계획 범위를 수정한 뒤 브라우저 없는 로컬 이미지 처리 단일 배치 명세 준비 검증 결과 보고를 구현한다."`: 완료.
  키워드 기반 앱/Supabase/UI 추천은 사용자와 확정한 스킬 전용 범위에 적용하지 않았다.
- `npm install --prefix .agents/skills/ewd-register-assign/scripts --cache /tmp/ewd-registration-npm-cache --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=15000`: 완료.
  오프라인 캐시 부재와 샌드박스 DNS 제한 후 허용된 네트워크 실행으로 설치했다.
- `npm test --prefix .agents/skills/ewd-register-assign/scripts`: **49/49 통과**.
  신규 표지/배치 테스트 30개 + 기존 배정 테스트 19개. skip/todo 없음.
  샌드박스의 자식 프로세스 출력 제한으로 처음 CLI 검사가 실패했다.
  spawn 오류도 assertion으로 확인하도록 하고 허용된 실행에서 전체 테스트를 통과했다.
- `python3 /home/joon/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/ewd-register-assign`: 통과.
- `npm run check:contracts`: 통과.
- 스킬·참조 문서의 상대 Markdown 링크: 누락 없음.
- 변경 전후 범위 밖 기존 파일 **134개 SHA-256 일치**, 보호 디렉터리의 신규 파일 0개.
  비교 대상: `app/`, `lib/`, `public/`, `supabase/`, 루트 `scripts/`, `tests/`,
  앱 `package.json`, `package-lock.json`, `next.config.mjs`.

신규 테스트는 Given–When–Then으로 정상·경계·잘못된 입력을 검사한다.
방향/축소/작은 이미지/투명 배경/잘못된 파일/상한, 등록만/1~2주/두 아동/순서/예외,
URL 필드/공용 링크/중복/누락 파일/잘린 JSON/덮어쓰기 거부/해시 불일치/CLI 출력을 다룬다.

앱 런타임 변경이 없어 전체 빌드·브라우저 검증은 실행하지 않았다.
운영 DB 조회·쓰기와 실제 로그인 앱·외부 오디오 실행도 하지 않았다.

## Follow-up Use

다음 실제 등록 요청에서 단일 명세로 Prepare하고 결과를 보여준다. 기존 Supabase
도구로 권한·중복·겹침 확인 후 허용된 신규 행만 등록한다. 등록 후 필드/표지 해시를
별도로 대조하고, 실제 로그인 앱 확인이 불가능하면 부모 확인 대기로 보고한다.

## 실제 사진 로컬 시험

사용자의 후속 시험 요청으로 기존 테스트 49개를 재실행해 통과했다. 실제 사진 2장의
압축·EXIF 방향 처리와 배정 준비, 실패 입력·무결성 확인 13개도 통과했다.
운영 데이터는 변경하지 않았다. 수치·범위·재현 명령은 [로컬 시험 결과](local-trial.md)에 기록했다.

## 표지 압축 전용 범위 확정

사용자가 표지 외곽 맞춤을 직접 맡기로 했다. 스킬의 표지 외곽 확인·배경 자르기·
회전/원근 보정·별도 보정본 생성/검토 지침과 로컬 도구의 보정본 선택 경로를 제거했다.
사용자가 준비한 파일 하나를 `sourceCover`로 받고 전체 영역을 압축한다.
압축 과정의 EXIF 방향 정규화, 비율 유지, 960px/JPEG 품질 72와 원본 보존은 유지한다.
QR 판독용 영역 처리와 과거 운영 결과 기록은 변경하지 않았다.

이전 보정 필드가 들어오면 무시해 다른 파일을 압축하지 않고 단일 `sourceCover` 지정
오류로 거부한다. 보정 동작 테스트는 제거하고 이 거부 동작 및 여백 보존 검증으로 교체했다.
새 거부 테스트는 변경 전 실패를 확인했다. 샌드박스의 자식 Node 실행 제한은 기존과 같아
전체 스킬 테스트는 허용된 로컬 실행으로 검증했다.

- `npm test --prefix .agents/skills/ewd-register-assign/scripts`: **51/51 통과**, skip/todo 0.
- `python3 /home/joon/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/ewd-register-assign`: 통과.
- `npm run check:contracts`: 통과.
- 스킬 참조 링크 누락 없음. 이번 변경 전후 범위 밖 기존 파일 **148개 해시 일치**.
- 앱 코드·DB 스키마·운영 데이터는 변경하지 않았다.

## Archive Handoff

사용자가 작업 완료 후 archive 이관·커밋·푸시를 요청했다. 최초 구현 범위의 Git
발행 제외와 별개로 이 후속 요청에 따라 계획을 이관하고 변경을 발행한다.

처리 규격·단일 표지 입력·배치 명세·등록/검증 절차는
[운영 문서](../../../docs/ai-registration-assignment.md)와
[스킬 참조](../../../.agents/skills/ewd-register-assign/references/batch-preparation.md)에
반영했다. 표지 외곽 맞춤은 사용자 책임, 스킬은 압축만 수행한다는 합의도 보존했다.
추가 ADR·도메인 모델 변경은 필요하지 않다. 완료된 4개 작업과 검증 기록을 함께 이관한다.
운영 DB/로그인 앱 검증은 스킬 개발 완료 조건에 포함하지 않았으며 미수행 상태를 유지한다.
