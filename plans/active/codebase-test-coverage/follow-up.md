# 실제 환경 후속 확인

## 현재 자동 완료 범위

현재 필수 계획은 DB query 대역·HTTP fixture·로컬 Next 브라우저 검사까지다. 실제 DB가 없어 SQL·RLS를 실행하지 않으며, 실기기는 후속 확인하도록 사용자가 선택했다. 아래 항목은 필수 step에 포함하지 않고 이 계획의 자동 통과를 막지 않는다. 미확인 결과를 검증 성공으로 표시하지 않는다.

## DB와 RLS

시작 조건: 사용자가 별도 DB 검증 작업을 요청하고, 운영과 분리된 폐기 가능한 로컬 Supabase 또는 테스트 전용 환경이 준비된다. 이 계획은 그 환경을 설치·연결·초기화하지 않는다. 후속 계획에서 실행 대상과 reset 범위를 먼저 확인한다.

| 후속 확인 | 기대 결과 | 필요한 증거 |
| --- | --- | --- |
| 빈 DB migration 전체 순서 적용 | 13개 migration을 적용해 현재 앱 컬럼·제약·관계를 사용할 수 있다 | 실제 migration apply 로그 및 최종 schema 조회 |
| 기존 데이터 upgrade | 옛 task/category/quiz 값이 정해진 규칙에 따라 보존·변환된다 | migration 직전 대표 fixture와 이후 row 비교 |
| 테이블 RLS | profiles/children/books/assignments/completions/audio_launches/manual_logs에 사용자 격리가 적용된다 | 실제 anon 및 A/B 사용자 역할의 select/insert/update/delete 결과 |
| owner 위조·owner 이전·다른 사용자 ID 참조 | 타인 자료 읽기/변경과 잘못된 child/book/assignment 소유 관계가 차단된다 | 실제 authenticated 역할의 거부·0행·데이터 불변 확인 |
| constraints | 날짜·task counts·task 유형·minutes·quiz 결과·unique/FK가 계약대로 처리된다 | 정상/경계/invalid SQL 및 오류 확인 |
| cascade | 배정/사용자 삭제의 관계 데이터 처리가 계약과 같다 | 삭제 전후 관계 row 조회 |
| 시리즈 RPC | owner 사용자만 자신의 정리된 시리즈를 받고 타인 요청은 노출되지 않는다 | 실제 권한과 RPC 실행 결과 |
| 신규/anonymous Auth profile trigger | email 없는 계정도 유효 profile을 만들고 외부 직접 함수 호출이 차단된다 | 실제 Auth 사용자 생성 및 권한 결과 |
| store 실연동 | embedded 조회·nullable·upsert·조건부 완료/복귀 저장이 DB에서도 동작한다 | 실제 SDK + 테스트 계정의 결과 재조회 |
| 동시에 도착한 저장 요청 | expected count 및 launch 조건이 오래된 write를 방지한다 | 모의 query가 아닌 실제 DB 경쟁 요청 결과 |

RLS assertion은 authenticated/anon 실제 역할로 실행해야 한다. 관리 권한 또는 service role로만 통과한 결과는 사용자 격리 증거가 아니다. SQL 트랜잭션과 앱 HTTP 통합 테스트의 정리 방식을 별도로 정하며 테스트 간 데이터 오염을 막는다. DB 환경이 없다는 사유로 RLS 테스트를 mock으로 대체해 Passed로 기록하지 않는다.

## Android 실기기

시작 조건: 기기/브라우저/PWA 설치 환경과 테스트 계정이 준비된다. 앱 버전·Android/Chrome 버전·재현 날짜·결과를 별도 기록한다.

- [ ] 홈 화면 설치와 manifest 아이콘·앱 시작을 확인한다.
- [ ] 읽기/정따/단어 읽기 링크를 실제 외부 앱 또는 탭으로 연다.
- [ ] 앱 복귀 후 선택한 배정·실행/복귀 시각·수동 완료 버튼을 확인한다.
- [ ] 긴 청취 후 세션 갱신·저장 상태·완료 재조회/재시작을 확인한다.
- [ ] 프로세스 재시작 또는 PWA 재로드 후 선택 복원을 확인한다.
- [ ] 실제 카메라 권한 허용/거부, 후면 카메라 QR, 사진 업로드를 확인한다.
- [ ] 화면 회전·가상 키보드·긴 한국어 텍스트·좁은 dialog의 조작을 확인한다.
- [ ] 온라인/오프라인 재진입과 SW 갱신 후 현재 fallback을 확인한다. 오프라인 완료 기능을 요구하지 않는다.
- [ ] 실물 인쇄/PDF에서 주간표 출력 품질을 확인한다.

synthetic focus/visibility/pageshow, viewport 크기, mock camera 성공은 이 결과를 대신하지 않는다.

## 실제 OAuth와 브라우저 확장

실제 Google OAuth 로그인·callback·logout·장시간 세션 갱신은 계정과 승인된 테스트 환경이 있을 때 수동 smoke 또는 별도 연동 검사로 수행한다. 자동 테스트에서는 OAuth 요청·callback 응답·쿠키 계약까지 확인한다.

WebKit/Firefox 전체 검사나 기기별 시각 snapshot 매트릭스가 필요하면 제품 지원 범위를 먼저 정한다. 현재 자동 계획은 Chromium을 필수 엔진으로 사용한다.
