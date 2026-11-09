# Review

## Status

Passed

## Plan Conformance

선택한 번개 아기에게 보상 기회 1개로 획득하는 `tail-attack`을 추가했다. 기존 날기와 동시 소유·중복 차감 방지·소유자 검증을 유지했다. 승인된 43프레임과 601×361px 셀을 보존하고 무손실 WebP를 빌드·캐시에 연결했다. 공격·앉기·날기·드래그 충돌 방지, 감소 동작, 선택/배경 전환 취소를 검증했다. 앱 커밋·사이트 배포는 범위 밖이다.

## Findings

앱·DB 계약의 미해결 결함은 발견하지 않았다. 기존 날기 브라우저 테스트에서 새로고침 후 프로필 자동 복원과 재선택이 경합했다. 실패 시 이미 아동 학습 화면이 표시된 근거를 확인하고, 저장된 프로필의 복원 후 드래곤 버튼을 기다리도록 테스트를 수정했다. 앱의 프로필 복원 코드는 변경하지 않았다.

연결 DB의 마이그레이션은 `thunder_tail_attack` / `20261109221237`로 적용했다. 현재 함수 본문 해시 `f41d54047d11e94a5b0015bdb74e3e71`는 로컬 SQL과 일치한다. RLS=true, anon RPC=false, authenticated RPC=true, authenticated direct UPDATE=false를 확인했다. Security advisors 결과는 변경 전후 같았다. 기존 search_path·rls_auto_enable·유출 비밀번호 보호 경고는 이 작업에서 변경하지 않았다. 기존 항목은 [search_path 검사](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [익명 definer 호출 검사](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)를 따른다.

## Verification Run

- `npm run verify`: 계약·SW·PWA·unit·typecheck·production build 통과.
- `npm run test:server -- tests/server/dragon-db.test.ts`: 50개 통과. 실제 모든 SQL 마이그레이션을 PGlite에서 적용한 뒤 획득·재시도·단계/속성 경계·기회 공유·권한·제약을 검사했다.
- `npm run test:component`: 전체 207개 통과. 이후 대기 중 공격 취소 회귀를 추가하고 관련 화면·공격 19개를 다시 실행해 통과했다.
- 모바일 390px·데스크톱 1280px의 꼬리 공격 브라우저 2개 통과. 프로필 복원 대기를 수정한 뒤 전체 드래곤 브라우저 회귀 29개가 모두 통과했다.
- 실제 Next/PWA 브라우저 4개 통과. v24의 공격 시트 캐시와 offline WebP 응답을 확인했다.
- 배포 WebP 3606×2888, 4,848,716바이트. 원본 PNG와 전체 알파·보이는 RGB가 일치한다.
- `git diff --check` 통과. 성공한 브라우저 캡처는 저장하지 않았다.

## Promotion Candidates

- 완료: 보상·사용·저장 규칙 → docs/dragon-rewards.md.
- 완료: 에셋 해상도·품질·용량·배치·잔여 결함 → assets/dragons/README.md.
- 완료: 배포 전 SQL 안내 → docs/supabase-setup.md.
- 완료: 꼬리 공격과 복수 기능 소유 용어 → docs/CONTEXT.md. 별도 ADR이 필요한 비가역적 설계 변경은 없다.
