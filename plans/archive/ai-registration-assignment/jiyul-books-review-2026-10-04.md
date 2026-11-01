# 김지율 책 등록 검토 — 2026-10-04

현재 상태: 후속 요청에 따라 **7권 등록·2026-10-11~16 배정 30행 저장 및 재조회 검증 완료**.
아래 검토는 저장 전 분석 기록이며, 최신 결과는 문서 끝의 실행 결과에 기록했다.

## 검토 범위와 대상

부모 요청은 `books/` 사진 분석과 등록 방안 검토다. 실제 자료 등록과 배정은
실행하지 않았다. 표지와 QR 페이지를 분석했으며 책 본문 전체나 오디오 재생 내용은
확인하지 않았다. 아래 내용 설명은 제공된 표지·제목·일부 안내문에서 확인한 범위다.

연결 프로젝트는 Supabase `english-with-dad` (`yocdammswepuwyvzydra`)다.
기존 Leo 자료의 소유자로 확인한 부모 계정 안에서 조회했다.
부모가 지정한 김지율은 앱의 `골든스피노`와 연결된다.
아동 ID는 `111e5fcd-be35-480f-8192-8eee41f03ef0`이다.
첫째·둘째 역할 자체는 이번 요청에서 명시하지 않았으므로 확정하지 않았다.

## 사진 분석

12장 = 표지 7장 + QR 페이지 5장. ORT의 한 페이지에는 QR이 두 개 있어
제공된 QR은 총 6개다. 표지의 자료 번호와 QR 번호를 앞자리 0을 제외하고 매칭했다.
공통 스티커 `English w. M 29`는 시리즈 이름으로 사용하지 않는다.

| 책 제목 | 자료 번호 | 표지 파일의 끝부분 | QR 파일의 끝부분 | 등록 시리즈 제안 | 확인한 내용·표지 정보 | 오디오 상태 |
|---|---|---|---|---|---|---|
| What Is It? | 01141 ↔ 1141 | 2201-02.jpg | 2201-01.jpg | ORT | Oxford Reading Tree. 도롱뇽 표지와 동물·단어 읽기에 관한 안내문 | 일반 읽기·정따 링크 각각 추출 |
| Hondo & Fabian | 06350 | 2222-01.jpg | 없음 | 그림책 | Peter McCarty 글·그림. 개와 고양이 표지 | QR 사진 또는 읽기 링크 필요 |
| Spot Goes to School | 06339 | 2222-02.jpg | 없음 | 그림책 | Eric Hill. 학교를 소재로 한 플랩북 | QR 사진 또는 읽기 링크 필요 |
| Monster Money | 00791 ↔ 791 | 2222-04.jpg | 2222-03.jpg | Scholastic | Hello Math Reader, Level 1. 돈·동전을 소재로 한 표지 | 읽기 링크 추출 |
| Willie's Wonderful Pet | 00790 ↔ 790 | 2222-06.jpg | 2222-05.jpg | Scholastic | Scholastic Reader, Level 1. 반려동물을 소재로 한 제목·표지 | 읽기 링크 추출 |
| My Tooth Is About to Fall Out | 00789 ↔ 789 | 2222-08.jpg | 2222-07.jpg | Scholastic | Scholastic Reader, Level 1. 빠질 이를 소재로 한 제목·표지 | 읽기 링크 추출 |
| My Dog Talks | 00788 ↔ 788 | 2222-10.jpg | 2222-09.jpg | Scholastic | Hello Reader!, Level 1. 개와 아이가 소통하는 표지 | 읽기 링크 추출 |

위 파일은 모두 [books](../../../books/)의 `Scanned_20261004-`로 시작한다.
ORT 레벨은 제공된 표지에서 확인되지 않았다. 자료 번호와 Scholastic 표지의
37~40 번호를 ORT 레벨이나 배정 순서로 해석하지 않는다.

## 인식한 링크

| 책 | `audio_listen` | `audio_shadow` |
|---|---|---|
| What Is It? | https://naver.me/539WsM8g | https://naver.me/FmGFe1sY |
| Monster Money | https://naver.me/xzHkl18n | 빈 값 |
| Willie's Wonderful Pet | https://naver.me/5WUC9MZL | 빈 값 |
| My Tooth Is About to Fall Out | https://naver.me/xZKtjiUK | 빈 값 |
| My Dog Talks | https://naver.me/5mv4hfNk | 빈 값 |
| Hondo & Fabian | 미제공 | 빈 값 |
| Spot Goes to School | 미제공 | 빈 값 |

jsQR로 원본·1/2·1/4 크기를 시도하고, 필요할 때 QR 영역을 잘라 축소·이진화해
6개 모두 디코딩했다. ZXing으로도 교차 확인을 시도했으며 다른 주소가 나온 사례는
없었다. URL은 모두 HTTPS 형태다. 주소 추출 성공과 실제 오디오 재생 검증은 구분한다.
단일 QR을 정따 필드까지 복제하지 않는다.

## 기존 자료와 등록 방안

2026-10-04 조회에서 동일 부모 소유의 자료를 제목의 대소문자·구두점·공백을
정규화해 검색하고 추출한 6개 링크를 읽기·정따 필드 양쪽에서 비교했다.
7권의 동일 제목이나 6개 링크와 일치하는 기존 자료는 없었다.
비슷한 제목의 `What Dogs Like`, `Monster math picnic`, `Monster math school time`,
`I lost my tooth!` 등은 이번 책과 다른 자료이므로 재사용 대상으로 삼지 않는다.
짧은 링크와 다른 주소가 같은 공유 대상을 가리키는지까지는 검증하지 않았다.

- 새 등록 후보: 7권. 읽기용 필수 링크까지 확보된 후보는 ORT 1권·Scholastic 4권이다.
- 시리즈 제안: 기존 앱 분류와 맞춰 `ORT`, `Scholastic`, `그림책`을 사용한다.
- 등록 시 `active=true`, `content_type='book'`, 인식한 제목·링크와 부모 소유를 저장한다.
- 표지는 원본을 보존하고 `compressCoverImage()`로 최대 변 960px·JPEG 품질 0.72의
  data URL을 만들어 기존 `books.cover`에 저장한다. 이번 검토에서는 압축·저장하지 않았다.
- 권·레벨·메모는 별도 입력 없이 비워 두는 기존 스킬 원칙을 따른다. 표지의 Level 1은
  위 표에 보존했으며 앱의 레벨 필드에 넣을지는 등록 시 별도로 정할 수 있다.
- 실제 등록 직전에 중복을 다시 조회한다. 기존 책·링크를 덮어쓰지 않는다.

## 배정 구성 검토

책 구성은 저장된 둘째의 1주 루틴에 정확히 맞는다. 다만 김지율의 둘째 역할,
용도별 묶음, 순서, 시작 일요일과 기간은 이번 요청으로 확정하지 않았다.

| 제안 용도 | 책 | 둘째 1주 루틴을 적용하는 경우 |
|---|---|---|
| 정따 | What Is It? 1권 | 일~금 매일 읽기·정따·스스로 읽기 각 1회, 퀴즈 없음 |
| 읽기 | Scholastic 4권 | 2권씩 3일, 각 책 읽기 1회, 퀴즈 없음 |
| 그림책 | Hondo & Fabian, Spot Goes to School | 두 권 모두 일~금 매일 읽기 1회, 퀴즈 없음 |

이 구성의 1주 배정은 총 30행(정따 6 + 읽기 12 + 그림책 12)이다. 토요일은 쉰다.
번호순을 원하면 Scholastic 37~40에 대응하는
`My Dog Talks → My Tooth Is About to Fall Out → Willie's Wonderful Pet → Monster Money`
순서를 제안할 수 있다. 촬영 파일에서는 이 순서가 뒤집혀 있으므로 부모의 선택 없이
배정 순서를 확정하지 않는다.

기존 김지율 배정은 조회 시점 기준 2026-10-09까지 있으며, 10월 4~9일에는
`readAloud`에 `Monkey tricks`, `focusListen`에 Scholastic 책과 그림책 시리즈 자료가
이미 있다. 이 기간으로 새 읽기·정따를 배정하면 겹친다. 그림책 시리즈 두 권이
`focusListen`으로 배정된 점도 확인했지만 기존 배정을 수정하지 않았다.
10월 10일 이후 배정은 이번 조회에서 발견되지 않았으며, 시작일이 정해지면
아동·활동·전체 기간의 겹침을 저장 직전에 다시 확인해야 한다.

## 다음 실행에 필요한 정보

1. Hondo & Fabian, Spot Goes to School의 QR 사진 또는 읽기 링크.
2. 위 정따·읽기·그림책 분류와 김지율의 둘째 루틴 적용 여부.
3. 배정을 요청할 때의 책 순서·시작 일요일·1주 또는 2주 기간.

이번 단계에서는 Supabase 조회만 수행했다. 책·배정·완료 기록을 변경하지 않았다.

## 후속 요청 실행 결과

부모가 10월 11일 신규 배정, 그림책 두 권의 YouTube 주소와 읽기 순서를 지정했다.
검토안의 둘째 1주 구성을 적용해 신규 책 7권과 배정 30행을 저장했다.
재사용 자료·배정은 각 0건이다.

| 날짜 | 읽기: 각 1회 | 정따 | 그림책: 각 1회 |
|---|---|---|---|
| 10월 11~13일(일~화) | My Dog Talks, My Tooth Is About to Fall Out | What Is It? 읽기·정따·스스로 읽기 각 1회 | Hondo & Fabian, Spot Goes to School |
| 10월 14~16일(수~금) | Willie's Wonderful Pet, Monster Money | 동일 | 동일 |
| 10월 17일(토) | 배정 없음 | 배정 없음 | 배정 없음 |

그림책의 읽기 링크는 부모가 제공한 주소를 그대로 저장했다.

- Hondo & Fabian: https://youtu.be/BB523166tPk?si=kymY1yCr4XLco4gw
- Spot Goes to School: https://youtu.be/G84Ote230N4?si=8z6thiNcSgMBmR7-

| 책 제목 | 신규 책 ID |
|---|---|
| What Is It? | 8382d22a-56d5-41b4-ba79-95b8f20b6fa8 |
| My Dog Talks | 5f12bc67-bfe6-44c1-8e09-7a13c2054362 |
| My Tooth Is About to Fall Out | 53534971-fb74-4bc7-af10-419dd1b84259 |
| Willie's Wonderful Pet | 3aedf6de-f160-4038-8167-f00cdadc8b10 |
| Monster Money | 9f179244-ac2c-40ac-9515-aa2268e2bc47 |
| Hondo & Fabian | 943110d4-4b53-4c9d-871e-59b3c5bdabd8 |
| Spot Goes to School | cabb78b8-8a88-43f5-85f3-59ce8d248a6b |

저장 전 확인: 동일 부모 소유의 중복 자료 0건, 김지율의 세 활동에 대한
2026-10-11~17 기존 배정 0건. 저장 중 동시 변경을 막는 트랜잭션에서 이를
재검사하고 책과 배정을 함께 삽입했다. 기존 행을 수정하거나 삭제하지 않았다.

표지는 앱의 `compressCoverImage()`로 최대 변 960px·JPEG 품질 0.72로 처리했다.
원본 사진의 SHA-256이 처리 전후 일치함을 확인했다.
저장 후 표지 data URL의 MD5·길이·형식과 7권의 제목·시리즈·활성·소유·유형·링크를
대조했다. 배정 30행의 ID·부모·아동·날짜·책·활동·과제·횟수·퀴즈가 후보와 모두
일치했고 토요일 배정은 없었다. 퀴즈는 모두 비활성, 퀴즈 결과는 모두 비어 있다.

`npm run verify` 전체 통과. 실제 로그인 앱의 표시와 오디오 재생은 검증하지 않았다.
부모의 앱 확인이 남아 있으므로 전체 실제 사용 시험을 완료로 표시하지 않는다.
배정 30행의 ID와 저장 결과는
[실행 결과 JSON](jiyul-assignment-result-2026-10-11.json)에 보존했다.
