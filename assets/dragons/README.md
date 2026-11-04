# 드래곤 정식 에셋

`source/`의 PNG 24개가 승인된 원화의 정식 원본이다. 앱 배포와 이미지 재생성은 `plans/`를 읽지 않는다. 기획 폴더의 이미지와 독립 미리보기는 제작 이력이다.

| 정식 원본 | 제작 당시 위치 | 용도 |
| --- | --- | --- |
| `source/eggs/*.png` | `plans/active/avatar-customization/dragon-assets/eggs/` | 알 3종 |
| `source/backgrounds/*.png` | 같은 dragon-assets의 `backgrounds/` | 배경 4종 |
| `source/props/*.png` | 같은 dragon-assets의 `props/` | 석비·용암 수정 |
| `source/baby/*.png` | `plans/active/avatar-customization/baby/original-cutouts/` | 무속성·불·번개·얼음, 눈 감기·들숨 |
| `source/adult-fire/*.png` | dragon-assets의 `fire-dragon/transparent/` | 성체 기본·동작 7장 |
| `source/effects/fire-stream.png` | dragon-assets의 `fire-dragon/effects/fire-stream-transparent.png` | 불길 |

`npm run assets:dragons`는 Sharp 0.34.5로 `public/assets/dragons/`에 WebP 24개를 생성한다. `npm run build`도 prebuild에서 같은 작업을 실행한다. PNG 원본과 배포 WebP를 함께 저장소에 포함한다. 변환은 리사이즈와 WebP 인코딩뿐이며 디자인을 재생성하지 않는다.

- 알·아기는 너비 1024px, 배경은 1600px, 소품은 640px, 성체·불길은 1200px 이하.
- `withoutEnlargement: true`, `quality: 90`, `alphaQuality: 100`으로 알파를 보존한다.
- 아기의 `lightning.png`는 앱 속성명에 맞춰 `baby/thunder.webp`로 출력한다.
- 기본 원화는 앱에 연결했다. 동작 프레임·효과도 배포 경로에 준비하지만 자동 재생과 스킬 버튼은 후속 작업이다.
- 청소년과 불 이외 성체는 아직 전용 원화가 없어 기존 `public/assets/dragons/dragons-v2.png`를 사용한다.

이미지는 Next가 정적 파일로 제공한다. DB에는 이미지 바이트·base64·원본 PNG를 저장하지 않으며 카탈로그의 ID·이름·kind·art 식별자와 드래곤의 선택 ID·배치 좌표만 저장한다.

## 아기 원화 확정 · 2026-11-04

알 부화 후 사용할 아기는 승인된 픽셀 분리본 6장으로 확정했다. 정식 PNG는 승인본과 바이트 단위로 동일한 2048×2048이며 원본 구도·좌표·불투명 픽셀의 RGB를 보존한다. 이전 `baby/transparent/`와 `baby/aligned/`는 앱 원본으로 사용하지 않는다.

부화 후 속성 선택 전에는 neutral, 불·번개·얼음 선택 후에는 fire·thunder·ice WebP를 표시한다. PNG 원본의 lightning 이름만 WebP 출력에서 thunder로 대응한다. blink·breathe도 같은 캔버스로 정식 보관했지만 이번 이관은 동작 재생 설정을 변경하지 않는다. 아기 단계는 기존 성장 규칙인 1~17일을 유지한다.
