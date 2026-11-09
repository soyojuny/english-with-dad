# 지온 다음 주 자료 검토 — 2026-11-15

검토일: 2026-11-08. 검토만 완료했으며 DB 등록·배정은 하지 않았다.

후속 실행: 부모가 하루 1권 읽기와 위 검토 순서를 승인했다. 신규 책 10권과
11월 15~20일 배정 24행을 저장하고 책·표지 해시·배정 전체 필드를 재조회해 검증했다.
위 검토 상태와 아래 미확정 설명은 실행 전 기록이다. 실제 로그인 앱·오디오 확인은
대기 중이며 [실행 결과와 ID](jion-registration-result-2026-11-15.json)에 기록했다.

## 확인 결과

- 입력: `books/지온/20261108_*.jpg` 20장, 표지 10장·QR 10장.
- 연결 프로젝트: `english-with-dad` (`yocdammswepuwyvzydra`).
- 아동: 김지온, 앱 이름 `앤더 드래곤`, ID `919b1219-6b55-479a-96cd-d00f362df9cb`.
- 부모 ID `0d6fb47c-66d1-44c2-be0f-7b1d6efd1b18` 소유를 재확인했다.
- 부모 소유 자료에서 정규화 제목 또는 QR URL이 일치하는 책은 0권이다.
- 2026-11-15~21 지온 기존 배정은 활동 구분 전체에서 0행이다.
- QR 10개 모두 추출했다. 원본 전체 처리 5개, EXIF 방향을 반영한 임시 축소본에서 추가 3개, 남은 2개는 축소본의 QR 영역·이진화 재시도로 인식했다. 겹치는 인식 결과는 일치한다.
- 표지·제공 페이지 정보만 관찰했다. 책 본문 전체와 오디오 내용·길이·실제 재생은 미확인이다.
- 원본을 보존했다. 저장용 표지 압축과 배정 후보 생성은 아직 하지 않았다.

## 자료 후보

파일명은 모두 `books/지온/20261108_` 접두사와 `.jpg` 확장자를 사용한다.
용도·시리즈·순서는 제안이며, 부모의 최종 지정으로 확정된 값은 아니다.
책 번호는 표지와 QR을 연결하는 데만 사용했다.

| 번호 | 제목 | 용도 제안 | 시리즈 입력값 제안 | 표지 / QR 시각 | URL |
|---|---|---|---|---|---|
| 288 | Henry and Mudge and the Sneaky Crackers | 정따 | Henry and Mudge | 201334 / 201912 | https://naver.me/xuF87zHG |
| 289 | Henry and Mudge in Puddle Trouble | 정따 | Henry and Mudge | 201411 / 201919 | https://naver.me/5fd0q1aU |
| 3603 | Horrid Henry's Holiday | 읽기 | Horrid Henry | 201435 / 201438 | https://naver.me/xgXdjGxD |
| 3604 | Horrid Henry's Underpants | 읽기 | Horrid Henry | 201455 / 201456 | https://naver.me/GQGpRyPq |
| 3605 | Horrid Henry Gets Rich Quick | 읽기 | Horrid Henry | 201513 / 201516 | https://naver.me/xsZFnYgl |
| 3606 | Horrid Henry and the Football Fiend | 읽기 | Horrid Henry | 201538 / 201541 | https://naver.me/F6QFcxIO |
| 3611 | Horrid Henry's Car Journey | 읽기 | Horrid Henry | 201608 / 201611 | https://naver.me/FHO2qu66 |
| 3610 | Horrid Henry Reads a Book | 읽기 | Horrid Henry | 201640 / 201658 | https://naver.me/GFs26eAK |
| 6830 | Mr Tick the Teacher | 그림책 | 그림책 | 201717 / 201720 | https://naver.me/FP888GWI |
| 7387 | Mr Creep the Crook | 그림책 | 그림책 | 201737 / 201740 | https://naver.me/FQujNPSF |

Mr Tick QR 원문은 `URL:https://naver.me/FP888GWI`이며 접두사를 제거했다.
나머지 QR 원문은 표의 URL과 같다.
읽기·그림책은 `audio_listen`, 정따는 `audio_shadow`에만 넣는 안이다.

## 1주 배정 제안과 확인할 점

‘다음 주’의 검토 범위는 11월 15일(일)~20일(금), 토요일 휴식이다.
기본 첫째 읽기는 1권을 2일씩 주 3권이다. 지난 배치의 하루 1권 방식은
해당 배치에만 합의되었으므로 이번에도 적용할지는 확인이 필요하다.
아래는 지난 배치처럼 읽기 하루 1권을 적용한다는 조건부 제안이다.
순서는 명확한 파일 시각 순서를 따랐으며, Car Journey가 Reads a Book보다 먼저다.

| 날짜 | 읽기: 1회 + 문제풀이 | 정따: 정따·스스로 읽기 각 1회 + 문제풀이 |
|---|---|---|
| 11/15 일 | Horrid Henry's Holiday | Henry and Mudge and the Sneaky Crackers |
| 11/16 월 | Horrid Henry's Underpants | Henry and Mudge and the Sneaky Crackers |
| 11/17 화 | Horrid Henry Gets Rich Quick | Henry and Mudge and the Sneaky Crackers |
| 11/18 수 | Horrid Henry and the Football Fiend | Henry and Mudge in Puddle Trouble |
| 11/19 목 | Horrid Henry's Car Journey | Henry and Mudge in Puddle Trouble |
| 11/20 금 | Horrid Henry Reads a Book | Henry and Mudge in Puddle Trouble |

그림책 Mr Tick the Teacher·Mr Creep the Crook은 일~금 매일 각 읽기 1회,
문제풀이 없음. 정따에는 별도 읽기를 추가하지 않는다.
이 안은 신규 책 후보 10권, 배정 후보 24행(읽기 6·정따 6·그림책 12)이다.
기본 읽기 루틴을 적용하려면 부모가 고른 3권을 2일씩 배정하는 대안이 있다.
실행 요청 시 날짜·용도·시리즈·순서를 최종 지정에 맞추고 소유·중복·배정 충돌을 다시 확인한다.
