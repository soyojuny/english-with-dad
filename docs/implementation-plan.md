# 아동용 책 읽기 관리 프로그램 구축 계획

## 확정 방향

- 형태: Next.js 웹앱 + PWA
- 오디오: 네이버 MYBOX/드라이브 링크 유지
- 아동 완료: 부모 승인 없이 즉시 인정
- 부모 입력: 책, 표지 사진, 읽기/정따 오디오 링크, 날짜별 할 일 직접 입력
- 반복: 반복 규칙을 저장하지 않고 입력 시 실제 날짜별 할 일로 생성

## PWA와 네이버 오디오

PWA에서도 외부 네이버 링크를 열 수 있다. 다만 외부 도메인의 재생 상태, 탭 닫힘, 오디오 종료 여부는 앱에서 확인할 수 없다.

권장 흐름:

1. 아동이 `읽기 오디오 열기` 또는 `정따 오디오 열기`를 누른다.
2. 앱이 오디오 시작 시각을 저장한다.
3. 네이버 링크를 `ewd-naver-audio` 이름의 탭으로 연다.
4. 아동이 듣고 PWA로 돌아온다.
5. 앱이 `visibilitychange`/`focus`로 복귀를 감지한다.
6. 아동이 `완료`를 누르면 활동 기록이 저장된다.

## 현재 프론트엔드 구조

- `Next.js App Router`
- `TypeScript`
- `app/page.tsx` 클라이언트 컴포넌트에서 MVP 상태 관리
- `localStorage` 기반 임시 저장
- `public/manifest.webmanifest`, `public/sw.js`로 PWA 구성
- `public/assets`에 표지와 아이콘 저장

## 화면

### 아동 화면

- 오늘 할 일 목록
- 책 선택 후 활동 표시
- `읽기`: 네이버 읽기 오디오 링크 + 완료
- `정따`: 네이버 정따 오디오 링크 + 완료
- `스스로 읽기`: 오디오 없이 완료
- 전체 도서관, 시리즈 필터, 검색, 읽은 날짜 표시

### 부모 화면

- 일/주/月 기간 선택
- 활동표 컬럼:
  - DVD
  - 읽기
  - 정따
  - 스스로 읽기
  - 한글책 읽기
  - 영어 그림책 읽기
  - 특이사항
- 시리즈별 읽음/미읽음과 읽은 날짜 표시

### 책 관리

- 시리즈
- 책 제목
- 권수/구분
- 레벨
- 표지 사진 촬영/업로드
- 읽기 네이버 링크
- 정따 네이버 링크
- QR 스캔으로 링크 입력
- 책 내용 수정

### 할 일 배정

- 아동 선택
- 시작일/종료일
- 반복 요일 선택
- 책 목록 선택
- 활동 선택: 읽기, 정따, 스스로 읽기
- 저장 시 날짜별 할 일 생성

## 데이터 모델

### children

- `id`
- `name`
- `level`
- `goal`

### books

- `id`
- `active`
- `contentType`: `book`, `wordReading`
- `series`
- `title`
- `volume`
- `level`
- `cover`
- `audio.listen`
- `audio.shadow`
- `note`

단어 읽기 자료는 `contentType = wordReading`으로 저장하고, 부모가 등록한 QR/URL은 `audio.listen`에 저장한다. 표지와 정따 링크는 요구하지 않는다.

### assignments

- `id`
- `childId`
- `date`
- `bookId`
- `activityCategory`: `focusListen`, `readAloud`, `englishPicture`, `extraStudy`
- `tasks`
- `taskCounts`
- `quizScore`: 보호자가 선택한 `"PASS"` 또는 `"FAIL"`, 미선택 시 `null`
- `quizEnabled`: 할 일 배정 시 퀴즈 포함 여부, 기본값 `false` (`N`)

### completions

- `assignmentId:taskType`
- `completedAt`
- `minutes`
- `audioOpenedAt`
- `count`

### audioLaunches

- `assignmentId:taskType`
- `openedAt`
- `returnedAt`

### manualLogs

- `id`
- `childId`
- `date`
- `type`: `dvd`, `passiveListen`, `korean`, `englishPicture`, `extraStudy`
- `title`
- `minutes`
- `note`

## 다음 단계

1. 실제 모바일에서 PWA 설치와 QR 스캔 확인
2. 부모 책 입력/수정 UX 다듬기
3. Supabase로 가족별 데이터 동기화
4. 표지/QR/오디오 링크를 서버 저장 방식으로 이전
5. 월간 리포트 출력과 CSV 가져오기 추가
