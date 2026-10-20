# 03 — 모바일과 인접 흐름 검증

## Goal

다양한 화면 크기에서 모달을 사용할 수 있고 인접 기능에 회귀가 없음을 확인한다.

## Work / Verify

- 360px·390px·1280px 폭과 짧은 높이에서 화면 안 표시, 문구 겹침, 가로 넘침, 내부 스크롤과 버튼 접근을 확인한다.
- 배경 조작 차단, 키보드 포커스, 닫기 후 페이지 위치, 연속 열기·닫기를 확인한다.
- `npm run test:browser:client -- child-reading-log-dialog.spec.mjs parent-report.spec.mjs mobile-layout.spec.mjs camera-upload.spec.mjs child-completion.spec.mjs`를 실행한다.
- `npm run verify`를 실행한다. 이 명령과 브라우저 테스트 결과를 따로 기록한다.
- 실제 모바일/PWA에서 가상 키보드를 열고 입력과 저장 버튼 접근을 확인한다. 기기를 사용할 수 없으면 미검증으로 남긴다.
- `../plan.md`의 합격 기준별 결과와 남은 한계를 `../review.md`에 기록한다. 미실행 항목을 통과로 표시하지 않는다.

## Result

자동 검증 완료. 관련 5개 파일 브라우저 회귀 81/81, `npm run verify`, Standards·Spec 최종 리뷰가 통과했다. 실제 모바일 가상 키보드·설치형 PWA는 미검증이다. 합격 기준별 결과와 보고서는 [review.md](../review.md)에 기록했다.
