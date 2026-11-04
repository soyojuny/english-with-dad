# 알 3종 원화 · 2026-11-04

오늘 출시를 우선해 알부터 준비한다. 기존 배경·기본 장식은 유지하고 추가 원화는 순차 제작한다. 이번 산출물은 투명 알과 독립 미리보기이며 실제 앱 적용·배포는 아직 하지 않았다.

## 파일 대응

원본은 `plans/active/avatar-customization/` 루트에 보존한다.

| 원본 (`Gemini_Generated_Image_` 접두사) | 배경 분리 원본 | 크기 정렬 최종본 |
| --- | --- | --- |
| `ndeixndeixndeixn.png` | `extracted/spotted.png` | `spotted.png` |
| `76z8lp76z8lp76z8.png` | `extracted/striped.png` | `striped.png` |
| `nihwvknihwvknihw.png` | `extracted/diamond.png` | `diamond.png` |

내장 `image_gen.imagegen`에 원본 경로와 `transparent_background: true`를 전달했다. CLI/API fallback은 사용하지 않았다. 생성 방식의 배경 분리이므로 원본과 미세한 질감·외곽 차이는 있을 수 있다.

## 배경 분리 프롬프트

```text
Use case: background-extraction. Edit target: the supplied dragon egg image. Remove ONLY the white background and any watermark outside the egg. Output a genuine transparent PNG. Preserve the complete egg silhouette, its exact ivory gray palette, scale texture, spot markings, dark outline, highlights and shading. No redesign, no recoloring, no new cracks, no ground shadow, no scenery. Keep the entire egg visible with the original framing and aspect ratio. This is an existing approved game asset, not a new design.
```

띠무늬는 `spot markings`를 `broad curved stripe markings`로, 마름모는 `diamond shaped brown markings`로 바꿨다. 각 이미지에 한 번씩 호출했다.

## 정렬과 확인

- `node plans/active/avatar-customization/dragon-assets/eggs/normalize.cjs`로 분리 결과를 리사이즈·투명 캔버스 중앙 정렬한다. 디자인 변경은 하지 않는다.
- 최종 PNG는 모두 RGBA 1024×1024. 알파 128 초과 기준 y=64…959, 높이 896px. x는 반점 178…845, 띠무늬·마름모 178…846이다.
- `preview.html`에서 알 3종과 기존 배경 4종을 전환할 수 있다. 기존 석비·용암 수정과 별도 CSS 접지 그림자를 사용한다.
- 장면은 16:9. 알 캔버스는 left 29%, bottom 7%, width 32%이며, 알 그림 자체의 투명 여백을 포함한다.
- Chromium에서 1280×800, 800×1280, 390×844, 320×740의 로컬 파일 로딩, 전체 알·배경 전환, 스크립트 오류 없음, 가로 넘침 없음을 확인했다. 브라우저 실행은 샌드박스 제한으로 승인된 외부 실행을 사용했다.
- `preview-1280x800.png`와 `preview-320x740.png`를 직접 열어 외곽·접지·무늬 구분을 검토했다. 나머지 두 크기도 캡처를 보존했다.
- `npm run check:pwa`, `npm run typecheck` 통과. 실제 기기 터치·실제 앱 연결은 아직 검증하지 않았다.
