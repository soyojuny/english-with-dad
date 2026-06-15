# English with Dad Reading Manager

아동별 영어책 과제, 부모 기록, 책 관리 화면을 제공하는 Next.js PWA입니다. 현재 버전은 Supabase Google 로그인과 읽기 데이터 CRUD가 모두 연결되어 있으며, 앱 데이터는 `localStorage`가 아니라 Supabase DB에 저장됩니다.

## 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

Supabase를 연결하려면 `.env.example`을 `.env.local`로 복사하고 값을 채웁니다.

```powershell
Copy-Item .env.example .env.local
```

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

Google OAuth와 테이블 생성은 [docs/supabase-setup.md](/D:/workspace/english-with-dad/docs/supabase-setup.md)에 정리되어 있습니다.

## 검증

```powershell
npm run verify
```

또는 개별적으로:

```powershell
npm run check:contracts
npm run test:unit
npm run typecheck
npm run build
```

AI 개발 하네스와 repo skill 구성은 [docs/development-harness.md](/D:/workspace/english-with-dad/docs/development-harness.md)에 정리되어 있습니다.

## 현재 기능

- 부모 Google 로그인
- 아동 추가/수정
- 책/단어 읽기 자료 등록, 수정, 비활성화 복구
- 날짜별 과제 생성
- 아동별 완료 기록, 수기 기록 저장
- 오디오 실행 시간 기록
- PWA manifest 및 service worker 포함

## 데이터 저장 구조

- 인증: Supabase Auth
- 앱 데이터: Supabase Postgres
- 현재 미사용: Supabase Storage

표지 이미지는 지금도 DB의 `books.cover` 텍스트 컬럼에 URL 또는 data URL로 저장할 수 있지만, 실제 사진 업로드를 계속 쓸 계획이면 나중에 Supabase Storage 버킷으로 옮기는 편이 맞습니다.
단어 읽기 자료는 `books.content_type = wordReading`으로 구분하고, QR 또는 URL은 `books.audio_listen`에 저장합니다.
