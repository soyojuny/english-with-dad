# Development Harness

이 프로젝트는 기능 추가보다 먼저 검증 가능한 개발 흐름을 유지한다.

## 기본 원칙

- 기능은 `app/page.tsx`에 바로 누적하지 않고, 재사용 가능한 로직은 `lib`로 분리한다.
- 브라우저 저장소 기반 MVP라도 데이터 구조는 실제 DB 전환을 전제로 타입을 유지한다.
- 배포 전에는 `npm run verify`를 통과해야 한다.
- 강제 수정 명령은 사용하지 않는다. 예를 들어 `npm audit fix --force`는 별도 검토 후 실행한다.

## 검증 계층

### 1. 정적 계약

- `public/manifest.webmanifest`의 PWA 필수 값 확인
- `public/sw.js` 구문 검사
- 서비스워커 캐시 대상 파일 존재 확인

### 2. 타입 계약

- `npm run typecheck`
- `lib/reading-types.ts`와 `lib/reading-data.ts`가 화면 데이터 계약의 기준이다.

### 3. 빌드 계약

- `npm run build`
- Next production 번들이 생성되는지 확인한다.

### 4. 수동/브라우저 검증

- 아동 화면에서 읽기/정따 오디오 링크 열기
- 앱 복귀 후 완료 기록 표시
- 책 관리에서 표지 사진과 QR 링크 입력
- 할 일 배정에서 날짜/요일 반복 생성
- 부모 화면에서 활동표와 시리즈 진행률 확인

## 명령

```powershell
npm run verify
```

개별 실행:

```powershell
npm run check:sw
npm run check:pwa
npm run typecheck
npm run build
```

## 다음 하네스 후보

- Supabase 스키마 마이그레이션 검증
- 브라우저 연결이 안정화된 뒤 Playwright E2E
- QR 스캔 지원 여부를 브라우저별로 기록하는 실기기 체크리스트
- 월간표 출력/PDF 기능이 생긴 뒤 스냅샷 테스트
