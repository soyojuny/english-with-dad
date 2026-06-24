# Supabase 설정

이 프로젝트는 `부모 1계정 로그인 + children/books/assignments/... 데이터 저장` 구조로 동작합니다.

프로젝트를 다른 리전으로 이전하는 절차는
[supabase-region-migration.md](/D:/workspace/english-with-dad/docs/supabase-region-migration.md)를 따릅니다.

## 1. 프로젝트 생성

Supabase에서 새 프로젝트를 만들고 아래 값을 확인합니다.

- `Project URL`
- `Publishable key`

## 2. 환경 변수

루트에서 `.env.example`을 `.env.local`로 복사하고 값을 채웁니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN=true
```

`NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN`은 개발 모드에서만 적용됩니다. `false`로 설정하면 로컬 테스트 로그인 버튼을
숨길 수 있습니다.

## 3. Google OAuth

Supabase Dashboard에서:

1. `Authentication > Providers > Google`
2. Google provider 활성화
3. Google Cloud Console에서 발급한 Client ID / Secret 입력

Google Cloud Console의 OAuth callback URL은 Supabase가 제공하는 값을 사용합니다.

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## 4. Redirect URL

Supabase Dashboard의 `Authentication > URL Configuration`에 앱 복귀 주소를 추가합니다.

```text
http://localhost:3000/auth/callback
```

배포 후에는 실제 도메인의 `/auth/callback`도 추가합니다.

## 5. 로컬 테스트 로그인

Google OAuth 리디렉션 없이 로컬 UI와 실제 Supabase CRUD를 검증하려면 Supabase Dashboard의
`Authentication > Providers > Anonymous Sign-Ins`를 활성화합니다.

`npm run dev`로 실행한 `localhost` 로그인 화면에는 `로컬 테스트로 시작` 버튼이 표시됩니다. 이 버튼은 Supabase
익명 사용자를 생성하므로 기존 `auth.uid() = owner_user_id` RLS를 그대로 통과합니다. 운영 빌드에서는 표시되지
않으며 service-role 키도 사용하지 않습니다.

익명 계정 데이터는 해당 브라우저 세션에 종속됩니다. 로그아웃하거나 브라우저 데이터를 지우면 같은 계정으로 다시
접근할 수 없습니다. 반복 테스트로 생성된 익명 사용자는 필요에 따라 Supabase에서 정리해야 합니다.

## 6. 테이블 생성

SQL Editor에서 아래 마이그레이션을 실행합니다.

- [supabase/migrations/20260608213000_init.sql](/D:/workspace/english-with-dad/supabase/migrations/20260608213000_init.sql)
- 이후 마이그레이션은 파일명 순서대로 실행합니다.
- 퀴즈 결과 기능에는 [supabase/migrations/20260621190000_assignment_quiz_score.sql](/D:/workspace/english-with-dad/supabase/migrations/20260621190000_assignment_quiz_score.sql), [supabase/migrations/20260624090000_assignment_quiz_result_text.sql](/D:/workspace/english-with-dad/supabase/migrations/20260624090000_assignment_quiz_result_text.sql), [supabase/migrations/20260624093000_assignment_quiz_only_tasks.sql](/D:/workspace/english-with-dad/supabase/migrations/20260624093000_assignment_quiz_only_tasks.sql)이 필요합니다.
- 할 일별 퀴즈 Y/N 기능에는 [supabase/migrations/20260621200000_assignment_quiz_enabled.sql](/D:/workspace/english-with-dad/supabase/migrations/20260621200000_assignment_quiz_enabled.sql)이 필요합니다.
- 익명 로컬 테스트 계정에는 [supabase/migrations/20260621210000_anonymous_local_test_profiles.sql](/D:/workspace/english-with-dad/supabase/migrations/20260621210000_anonymous_local_test_profiles.sql)이 필요합니다.

생성되는 주요 테이블:

- `profiles`
- `children`
- `books`
- `assignments`
- `completions`
- `audio_launches`
- `manual_logs`

모든 업무 테이블은 `owner_user_id` 기준 RLS를 사용합니다.

## 7. 현재 연결 상태

현재 앱에서 연결된 범위:

- 부모 Google 로그인
- localhost 개발 모드의 익명 테스트 로그인
- Supabase 세션 유지
- 읽기 데이터 전체 CRUD
- 아동/책/과제/완료/수기 기록 DB 저장
- 책과 단어 읽기 자료를 `books.content_type`으로 구분해 저장

## 8. Storage가 필요한 경우

지금 단계에서는 Supabase Storage가 필수는 아닙니다.

- 필수 아님: 책 메타데이터, 과제, 완료 기록, 수기 기록, 오디오 링크
- 권장: 부모가 찍은 표지 사진을 실제 파일로 계속 업로드할 계획일 때

현재 구현은 `books.cover` 텍스트 컬럼에 URL 또는 data URL을 저장할 수 있습니다. 다만 사진 업로드를 계속 쓸 거면 `book-covers` 같은 Storage 버킷을 만들고 파일 URL만 DB에 저장하는 구조로 옮기는 편이 맞습니다.

단어 읽기 자료는 표지 사진을 요구하지 않고, QR 스캔 또는 직접 입력한 URL을 `books.audio_listen`에 저장합니다.
