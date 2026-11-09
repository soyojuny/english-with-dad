# 지온 자료 검토 — 2026-11-08

상태: 검토만 완료. books·assignments 저장 및 기존 루틴 변경 없음.

후속 실행: 같은 날 부모가 이 검토안의 하루 1권 읽기 및 전체 등록·배정을 승인했다.
신규 책 10권·배정 24행을 저장하고 DB 재조회를 완료했다. 위 검토 상태는 실행 전 기록이다.
실제 로그인 앱·오디오 확인은 대기 중이며,
[실행 결과와 ID](jion-registration-result-2026-11-08.json)에 저장 내역을 보관한다.

## 확인한 자료와 범위

- 입력: `books/지온/`의 사진 20장, 표지 10장·QR 사진 10장.
- 프로젝트: `english-with-dad` (`yocdammswepuwyvzydra`).
- 아동: 김지온, 현재 앱 표시 이름 `앤더 드래곤`, ID `919b1219-6b55-479a-96cd-d00f362df9cb`.
- 부모 소유를 현재 DB에서 재확인했다. 중복 검색과 배정 조회는 이 아동의 부모 소유 범위로 제한했다.
- 표지·QR 번호의 앞자리 0을 제외하고 짝을 확인했다. 아래 용도와 배정 순서는 검토 제안이며 부모의 신규 지정으로 확정된 값은 아니다.
- QR 10개 모두 HTTP(S) 주소 인식. 전체 사진에서 4개, EXIF 방향을 반영한 임시 사진의 QR 영역 축소·이진화 재시도에서 나머지 6개를 읽었다. 원본 보존.
- 표지·제공 페이지 정보만 확인했다. 본문 전체 내용, 오디오 내용·길이·실제 재생은 미확인이다.
- 현재 소유 자료에서 정규화 제목 또는 QR 링크가 일치하는 책은 0권이었다.
- 2026-11-08~13 해당 아동의 읽기·정따·그림책 기존 배정은 0행이었다.

## 등록 후보

표지·QR 파일 이름은 모두 `books/지온/20261108_` 접두사와 `.jpg` 확장자를 사용한다.
시리즈 입력값은 아래와 같이 제안하며, 그림책 두 권 표지에는 Happy Families 표기가 있다.
읽기·그림책 링크는 `audio_listen`, 정따 링크는 `audio_shadow`에만 저장하는 안이다.
정따의 별도 읽기 활동은 추가하지 않는다.

| 번호 | 제목 | 용도 제안 | 시리즈 입력값 제안 | 표지 / QR 파일 시각 | QR 원문 = URL |
|---|---|---|---|---|---|
| 286 | Henry and Mudge and the Tumbling Trip | 정따 | Henry and Mudge | 195745 / 195748 | https://naver.me/FORb3lGL |
| 287 | Henry and Mudge Take the Big Test | 정따 | Henry and Mudge | 195801 / 195803 | https://naver.me/5HyDnlbo |
| 1073 | Nate the Great and the Phony Clue | 읽기 | Nate the Great | 195922 / 195924 | https://naver.me/FORbWi5G |
| 1074 | Nate the Great and the Missing Key | 읽기 | Nate the Great | 195938 / 195940 | https://naver.me/5GcSkbEG |
| 1075 | Nate the Great and the Snowy Trail | 읽기 | Nate the Great | 195957 / 195959 | https://naver.me/FZoOEKsN |
| 1076 | Nate the Great and the Lost List | 읽기 | Nate the Great | 200014 / 200017 | https://naver.me/5K6hfSBG |
| 3601 | Don't Be Horrid, Henry! | 읽기 | Horrid Henry | 200034 / 200037 | https://naver.me/5l2YD6cK |
| 3602 | Horrid Henry's Birthday Party | 읽기 | Horrid Henry | 200054 / 200058 | https://naver.me/I5wtsoDV |
| 7389 | Mrs Wobble the Waitress | 그림책 | 그림책 | 200121 / 200123 | https://naver.me/xrzAbF0J |
| 7388 | Mrs Lather's Laundry | 그림책 | 그림책 | 200146 / 200148 | https://naver.me/5VxPVahc |

표지 전체를 비율 유지·EXIF 방향 반영 후 최대 변 960px, JPEG 품질 72로 압축하는 기존 규칙을 적용할 수 있다. 검토 단계에서는 저장용 표지를 만들지 않았다.

## 이번 주 배정 제안

‘이번 주’는 검토용으로 11월 8일(일)~13일(금)을 놓았다. 실제 저장 전 날짜·용도·순서 확인이 필요하다.

문서와 routines.json의 첫째 읽기 기본은 1권을 2일씩, 주 3권이다.
그러나 지난주 실제 DB 및 `jion-registration-result-2026-11-01.json`은 읽기 6권을 하루 1권씩 배정한 상태다.
이는 관찰한 지난주 배치의 방식이며, 영구 루틴 변경 합의가 확인된 것은 아니다.
이번 입력의 책 수만으로 루틴을 변경하거나 기간을 확정하지 않는다.

지난주 방식을 이번 배치에도 적용한다는 전제의 제안:

| 날짜 | 읽기: 매일 1회 + 문제풀이 | 정따: 정따·스스로 읽기 각 1회 + 문제풀이 |
|---|---|---|
| 11/8 일 | Nate the Great and the Phony Clue | Henry and Mudge and the Tumbling Trip |
| 11/9 월 | Nate the Great and the Missing Key | Henry and Mudge and the Tumbling Trip |
| 11/10 화 | Nate the Great and the Snowy Trail | Henry and Mudge and the Tumbling Trip |
| 11/11 수 | Nate the Great and the Lost List | Henry and Mudge Take the Big Test |
| 11/12 목 | Don't Be Horrid, Henry! | Henry and Mudge Take the Big Test |
| 11/13 금 | Horrid Henry's Birthday Party | Henry and Mudge Take the Big Test |

그림책 `Mrs Wobble the Waitress`·`Mrs Lather's Laundry`는 일~금 매일 각 읽기 1회, 문제풀이 없음.
토요일은 쉰다. 이 안의 합계는 신규 책 후보 10권, 배정 후보 24행(읽기 6·정따 6·그림책 12)이다.

기본 루틴을 그대로 적용하는 대안은 부모가 고른 읽기 3권을 2일씩 배정하고 나머지 3권은 자료만 등록하는 방식이다.
읽기 6권을 하루 1권으로 할지, 기본 루틴대로 3권만 쓸지가 핵심 확인 사항이다.
실제 저장 요청이 오면 이 검토의 링크·사진 대응을 재사용하고, 최신 지정을 반영한 뒤 중복·주간 충돌을 다시 조회한다.
