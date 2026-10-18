# Step 02 — 공용 Sharp 이미지 처리기

## What to Build

Step 01에서 확정한 계약을 수행하는 Node 이미지 처리기를 `lib/`의 작은 서버 전용 모듈로
구현한다. 앱 등록 경로와 CLI가 같은 모듈을 호출하도록 경계를 만든다. Sharp를 직접
사용한다면 transitive dependency에 기대지 않고 프로젝트 의존성을 명시한다.

표지 기하 보정은 별도 입력 산출물로 취급한다. 처리기는 생성형 보정이나 자동 내용
복원을 하지 않고 방향 정규화, 축소, 배경 합성, 메타데이터 제거, 인코딩과 용량 제한만 맡는다.

## Acceptance Criteria

- [ ] Playwright/Chromium/DOM/canvas 없이 Node에서 실행됨.
- [ ] EXIF 방향을 반영하고 비율을 유지하며 작은 이미지를 확대하지 않음.
- [ ] 투명 입력의 배경색을 명시적으로 처리.
- [ ] 확정한 포맷·최대 해상도·품질·목표 용량 규칙을 적용.
- [ ] 품질 하한에서도 목표를 넘으면 정한 단계로 해상도를 낮추거나 명시적으로 실패.
- [ ] MIME, 원본/결과 크기, 해상도, SHA-256과 저장 문자열 길이를 반환.
- [ ] 이미지가 아닌 파일, 빈 파일, 손상 파일, 허용 범위 밖 픽셀 수를 거부.
- [ ] 클라이언트와 CLI가 서로 다른 압축 알고리즘을 소유하지 않음.
- [ ] 기존 책 저장의 `owner_user_id` 경계와 데이터 계약을 유지.

## Required Verification

`docs/testing-guidelines.md`에 따라 각 테스트에 Given–When–Then 주석을 둔다. 정상 세로형,
가로형, 작은 이미지, EXIF 회전, 투명 이미지, 손상 파일, 과대 이미지, 목표 용량 초과를
고정 fixture로 검사한다. 픽셀 완전 일치보다 해상도·포맷·용량·메타데이터 계약을 검사한다.

좁은 테스트, `npm run check:contracts`, `npm run typecheck`; 이 단계가 앱 경로를 바꾸면
관련 브라우저 회귀도 실행한다. 이미지 변환 검증 자체에는 Playwright를 사용하지 않는다.

## Blocked By

[Step 01](01-baseline-and-contract.md)의 처리 계약과 저장 위치 결정.
