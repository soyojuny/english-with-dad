# Step 03 — 단일 배치 명세와 dry-run

## What to Build

아동·주차·기간·용도·책 순서·제목·시리즈·원본/보정 표지·오디오 필드와 URL을 담는
단일 배치 명세 형식과 검증기를 만든다. 처리 표지와 배정 후보는 이 명세에서 생성하며,
Prepare 단계는 DB에 쓰지 않는다.

## Acceptance Criteria

- [ ] 책 순서는 필수이며 파일 열거 순서로 암묵적으로 정하지 않음.
- [ ] 읽기/정따/그림책 용도가 URL 저장 필드 및 배정 task와 일치함.
- [ ] 아동 ID와 routine role을 구분하고 소유 확인 전 계획 ID를 운영 행으로 취급하지 않음.
- [ ] 원본·보정·처리 표지의 경로, 해상도, 바이트와 해시를 기록.
- [ ] 배정 생성기 결과를 포함하고 날짜별 제목·활동·횟수·퀴즈를 사람이 읽을 수 있게 출력.
- [ ] 누락 링크, 잘못된 URL, 잘못된 책 수, 일요일이 아닌 시작일, 중복 책을 거부.
- [ ] 전체 명세의 길이와 SHA-256을 기록하고 부분 전달을 감지.
- [ ] Prepare 실행만으로 Supabase 책·배정 행이 바뀌지 않음.
- [ ] 모호한 제목·사진 짝·순서만 사용자 확인 대상으로 표시.

## Required Verification

정상 1주/2주, 순서 변경, 두 아동 묶음, 잘못된 URL 필드, 누락 사진, 중복 ID,
잘린 JSON을 Given–When–Then 테스트로 검사한다. 기존
`.agents/skills/ewd-register-assign/scripts/plan-assignments.mjs`의 루틴 계약을 재사용하고
동일 규칙을 별도로 복제하지 않는다.

## Blocked By

[Step 02](02-shared-image-processor.md)의 처리 표지 메타데이터 계약.
