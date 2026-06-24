# Supabase Mumbai → Seoul 리전 이전

이 문서는 기존 `South Asia (Mumbai) / ap-south-1` 프로젝트를 새
`Northeast Asia (Seoul) / ap-northeast-2` 프로젝트로 이전하는 운영 절차다.

Supabase 프로젝트의 primary region은 생성 후 변경할 수 없으므로 새 프로젝트를 만들고 데이터를 이전해야 한다.
Postgres의 `timezone` 설정과 프로젝트의 물리 리전은 별개다. 이 절차의 대상은 DB timezone 변경이 아니라 물리
리전 변경이다.

## 이 프로젝트의 이전 범위

- Supabase Auth Google 사용자와 identity
- `public.profiles`
- `public.children`
- `public.books`
- `public.assignments`
- `public.completions`
- `public.audio_launches`
- `public.manual_logs`
- 함수, trigger, RLS policy, index, constraint
- `supabase_migrations` 이력(기존 프로젝트에서 CLI migration 이력을 관리한 경우)

현재 저장소 기준으로 이전할 필요가 없는 항목:

- Supabase Storage object: 사용하지 않음
- Edge Functions: 사용하지 않음
- Realtime publication: 사용하지 않음

Google OAuth provider 설정, Redirect URL, API key는 DB dump에 포함되지 않으므로 새 프로젝트에서 수동 설정한다.

## 핵심 원칙

1. 새 프로젝트에 저장소 migration을 먼저 전부 실행한 뒤 full dump를 복원하지 않는다.
   schema 중복과 managed schema 충돌을 만들 수 있다.
2. Google 사용자의 `auth.users.id`를 보존한다. 업무 테이블의 `owner_user_id`가 이 UUID를 참조하기 때문이다.
3. 전환 직전 기존 앱의 쓰기를 중단하고 final dump를 생성한다.
4. 기존 프로젝트는 전환 후 즉시 삭제하지 않고 최소 7일간 read-only 롤백 대상으로 유지한다.
5. DB password, service-role key, dump 파일은 Git에 추가하지 않는다.

## 사전 준비

- Supabase CLI 최신 버전
- Docker Desktop
- PostgreSQL `psql`
- 기존/신규 프로젝트의 database password
- 기존/신규 프로젝트의 Session pooler connection string
- Google Cloud Console과 Supabase Dashboard 접근 권한

공식 문서에서는 일반 네트워크에서 Session pooler 연결 문자열을 기본으로 권장한다. IPv6 direct connection이
가능한 환경에서는 direct connection도 사용할 수 있다.

PowerShell 세션에 연결 문자열을 넣는다. 실제 비밀번호가 shell history나 화면 공유에 남지 않도록 주의한다.

```powershell
$env:OLD_DB_URL = "postgresql://postgres.<OLD_REF>:<PASSWORD>@<OLD_POOLER_HOST>:5432/postgres"
$env:NEW_DB_URL = "postgresql://postgres.<NEW_REF>:<PASSWORD>@<NEW_POOLER_HOST>:5432/postgres"
```

## 1. 기존 프로젝트 기준선 기록

기존 앱에서 새 쓰기 작업을 중단하기 전에 아래 값을 기록한다.

```sql
select 'auth.users' as object_name, count(*) as row_count from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'children', count(*) from public.children
union all select 'books', count(*) from public.books
union all select 'assignments', count(*) from public.assignments
union all select 'completions', count(*) from public.completions
union all select 'audio_launches', count(*) from public.audio_launches
union all select 'manual_logs', count(*) from public.manual_logs
order by object_name;
```

소유권과 외래키 정합성도 확인한다.

```sql
select count(*) as orphan_children
from public.children c
left join auth.users u on u.id = c.owner_user_id
where u.id is null;

select count(*) as orphan_books
from public.books b
left join auth.users u on u.id = b.owner_user_id
where u.id is null;

select count(*) as cross_owner_assignments
from public.assignments a
join public.children c on c.id = a.child_id
join public.books b on b.id = a.book_id
where a.owner_user_id <> c.owner_user_id
   or a.owner_user_id <> b.owner_user_id;
```

세 결과는 모두 `0`이어야 한다.

## 2. Seoul 신규 프로젝트 생성

Supabase Dashboard에서 새 프로젝트를 생성한다.

- Region: `Northeast Asia (Seoul)`
- AWS region code 확인: `ap-northeast-2`
- Compute/Disk: 기존 프로젝트와 같거나 한 단계 이상
- Database password: password manager에 별도 보관

유료 플랜의 `Restore to a New Project` 기능은 원본과 같은 리전에 복원되므로 Mumbai → Seoul 이동에는 사용할 수
없다. 이 리전 이전은 CLI dump/restore 방식으로 진행한다.

## 3. 기존 프로젝트 dump

작업 디렉터리는 저장소 밖의 보안 임시 디렉터리를 사용한다.

```powershell
New-Item -ItemType Directory -Force "$env:TEMP\ewd-supabase-migration" | Out-Null
Set-Location "$env:TEMP\ewd-supabase-migration"

supabase db dump --db-url $env:OLD_DB_URL -f roles.sql --role-only
supabase db dump --db-url $env:OLD_DB_URL -f schema.sql
supabase db dump --db-url $env:OLD_DB_URL -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

기존 프로젝트가 Supabase CLI migration history를 실제로 관리하고 있었다면 history도 별도로 dump한다.

```powershell
supabase db dump --db-url $env:OLD_DB_URL -f history_schema.sql --schema supabase_migrations
supabase db dump --db-url $env:OLD_DB_URL -f history_data.sql --use-copy --data-only --schema supabase_migrations
```

dump 파일이 비어 있지 않은지 확인한다.

```powershell
Get-ChildItem *.sql | Select-Object Name,Length
```

## 4. 신규 프로젝트 restore

새 프로젝트에서 필요한 non-default extension을 먼저 활성화한다. 현재 앱 migration은 `pgcrypto`를 사용한다.

전체 restore:

```powershell
psql `
  --single-transaction `
  --variable ON_ERROR_STOP=1 `
  --file roles.sql `
  --file schema.sql `
  --command "SET session_replication_role = replica" `
  --file data.sql `
  --dbname $env:NEW_DB_URL
```

CLI migration history를 보존해야 하는 경우:

```powershell
psql `
  --single-transaction `
  --variable ON_ERROR_STOP=1 `
  --file history_schema.sql `
  --file history_data.sql `
  --dbname $env:NEW_DB_URL
```

restore 중 `supabase_admin` owner 또는 `cli_login_postgres` grant 오류가 발생하면 공식 troubleshooting 절차에
따라 dump의 해당 owner/grant 문장만 제거하고 새 프로젝트를 초기화한 뒤 restore를 처음부터 다시 수행한다.
부분 성공한 DB 위에 반복 restore하지 않는다.

## 5. 저장소 migration 정합성

restore 시점의 기존 DB에 저장소의 최신 migration이 모두 적용되어 있었다면 추가 실행하지 않는다.

기존 DB에 아직 적용하지 않은 migration이 있다면 restore 완료 후 신규 DB에 누락된 파일만 순서대로 적용한다.
현재 특히 확인할 파일:

```text
supabase/migrations/20260621210000_anonymous_local_test_profiles.sql
```

SQL Editor에서 무조건 전체 migration을 재실행하지 말고, `supabase_migrations.schema_migrations` 또는 기존 운영
기록과 저장소 파일을 비교해 누락분만 적용한다.

## 6. Auth와 Google OAuth 재설정

새 Supabase 프로젝트에서 다음을 수동 설정한다.

1. `Authentication > Providers > Google` 활성화
2. 기존 Google Client ID / Secret 입력
3. Google Cloud Console의 Authorized redirect URI에 신규 callback 추가

```text
https://<NEW_PROJECT_REF>.supabase.co/auth/v1/callback
```

4. Supabase `Authentication > URL Configuration` 설정
   - production Site URL
   - `http://localhost:3000/auth/callback`
   - production `/auth/callback`
5. 로컬 테스트 로그인을 사용할 경우 Anonymous Sign-Ins 활성화

기존 프로젝트 callback URI는 롤백 기간 동안 제거하지 않는다.

Auth 사용자와 identity가 dump에 포함되어 UUID는 보존되지만, 새 프로젝트의 API/JWT 설정은 별도이므로 기존
브라우저 세션은 신뢰하지 않는다. 전환 후 모든 사용자는 Google로 다시 로그인하는 것을 기준으로 검증한다.

## 7. 신규 DB 검증

### 데이터

1단계의 row count SQL을 신규 DB에서 다시 실행해 모든 수가 일치하는지 확인한다.

추가 확인:

```sql
select count(*) as profiles_without_auth_user
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null;

select count(*) as auth_users_without_profile
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

둘 다 `0`이어야 한다.

### RLS

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'children',
    'books',
    'assignments',
    'completions',
    'audio_launches',
    'manual_logs'
  )
order by tablename;
```

모든 `rowsecurity` 값이 `true`여야 한다.

### 앱 smoke test

- Google 로그인
- 기존 부모 계정의 아동/책/과제 데이터 조회
- 아동 추가 후 새 행의 `owner_user_id` 확인
- 책 수정
- 과제 생성과 삭제
- 완료 기록 및 퀴즈 결과 저장
- 로그아웃 후 다른 사용자가 해당 데이터를 볼 수 없는지 확인

## 8. Cutover

1. 기존 앱을 maintenance/read-only 상태로 전환
2. 기준선 이후 쓰기가 있었다면 final dump/restore를 다시 수행
3. 신규 DB 검증 완료
4. 배포 환경 변수 교체

```env
NEXT_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<NEW_PUBLISHABLE_KEY>
```

5. 새 배포 실행
6. 로그인 및 CRUD smoke test
7. 기존 프로젝트를 read-only 롤백 대상으로 유지

API key는 프로젝트별로 다르므로 URL만 바꾸고 기존 key를 재사용하면 안 된다. service-role key를
`NEXT_PUBLIC_*` 변수에 넣지 않는다.

## 9. 롤백

전환 후 오류가 발생하면:

1. 신규 앱의 쓰기를 즉시 중단
2. 배포 환경 변수를 기존 Mumbai 프로젝트 URL/key로 복원
3. 기존 callback과 Google provider 설정이 유지되어 있는지 확인
4. 재배포

신규 Seoul DB에서 발생한 쓰기는 자동으로 기존 DB에 역복제되지 않는다. Cutover 이후 롤백 가능 시간을 짧게
유지하고, 롤백이 필요하면 신규 DB의 변경분을 별도 추출해 병합해야 한다.

## 10. 종료

- 최소 7일간 오류와 데이터 정합성 관찰
- 기존 프로젝트 final backup 보관
- 기존 Google callback URI 제거
- 기존 Mumbai 프로젝트 삭제 또는 pause
- migration 임시 디렉터리와 SQL dump를 안전하게 삭제
- Supabase Advisors에서 security/performance 경고 확인

## 예상 중단 시간

현재 앱 규모에서는 데이터 양보다 수동 검증과 배포 시간이 더 큰 비중을 차지할 가능성이 높다. final dump 시작부터
신규 앱 smoke test 완료까지 쓰기를 중단하는 방식이 가장 안전하다. 무중단 dual-write는 이 앱 규모와 현재 구조에
비해 복잡성과 데이터 충돌 위험이 크므로 권장하지 않는다.
