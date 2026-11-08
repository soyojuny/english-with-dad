# 검토

정상: 기회 1개로 기능 획득, 이륙→공중 대기→좌우 비행→착륙.
경계: 기회 0/1개, 아기 1/17일과 알/청소년, 이착륙 중 연타, 비행 중 5초 대기, 화면/속성 전환, 움직임 줄이기.
잘못된 입력: 미지원 기능, 다른 아동/가족의 드래곤, 무속성 아기 이외 최초 획득, 직접 DB 변경.

원본 프레임은 그대로 보존한다. 준비된 시트는 검정 배경 알파 분리와 공통 캔버스 배치만 수행한다.

## 검증 결과

- `npm run verify` 통과: 계약·SW·PWA 검사, 전체 단위 테스트, 타입 검사, 운영 빌드.
- 드래곤 컴포넌트/날기 hook 41개, 실제 migration을 적용하는 DB 테스트 30개 통과.
- 드래곤 client HTTP 브라우저 회귀 21개 통과. 가로 경계 25~74% 보완 후 새 날기 3개를 다시 통과했다(390·1280px, 양방향 이동 경계, 획득 후 재조회, 역순 착륙, 움직임 줄이기, 꾸미기 취소).
- 실제 Next/PWA 브라우저 4개 통과. 새 날기 3종의 사전 캐시 및 오프라인 응답을 확인했다. 운영 DB와 원격 서비스에는 연결하지 않았다.
- 시트의 51프레임을 원본과 비교하여 보존된 2,288,103개 불투명 픽셀의 RGB 차이가 0임을 확인했다. 배경 알파 분리와 캔버스 배치 외 생성형 편집은 없다.
- 모바일/데스크톱 스크린샷에서 배경 투명도와 조작부 배치를 확인했다. `git diff --check` 통과.

검증 로그는 로컬 `/tmp/dragon-flight-review/verify-final.log`, 브라우저 결과는 `verification-artifacts/`에 있다. 원격 DB 마이그레이션 적용·배포·커밋은 수행하지 않았다. 실제 다중 연결 잠금 경쟁과 물리 모바일 기기의 성능은 이번 로컬 검증에 포함하지 않는다.

## 운영 DB 적용 · 2026-11-08

사용자의 후속 지시로 운영 Supabase `english-with-dad` (`yocdammswepuwyvzydra`)에 검증한 SQL을 `dragon_flight`로 적용했다. 원격 migration 버전은 `20261108132018`이다. 적용 전 RPC 본문은 로컬 기존 migration과 같았다. 기존 드래곤 4개가 유지되고 skills는 빈 배열로 초기화되었다. RLS·owner_user_id 조회 정책, authenticated의 직접 UPDATE 금지, anon의 RPC 실행 금지, authenticated의 RPC 실행 권한을 확인했다.

보안 advisor도 확인했다. `dragon_world`의 authenticated SECURITY DEFINER 실행은 기존 보상 원장 보호 설계이며, 빈 search_path와 소유권 검사·아동 행 잠금을 유지한다. 이번 migration이 변경하지 않은 기존 항목은 별도 후속 검토 대상으로 남긴다.

- `set_updated_at`, `is_valid_assignment_task_counts`의 [가변 search_path 권고](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- `rls_auto_enable`의 [anon SECURITY DEFINER 실행 권고](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)와 [authenticated 실행 권고](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- [유출 비밀번호 차단 설정 권고](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

정식 PNG·WebP 이관은 완료했다. 원본 캡처와 검토 HTML은 `tmp_dragon/`에 보존하고 배포 커밋에서는 제외한다. 다른 책 등록 작업 변경도 포함하지 않는다.
