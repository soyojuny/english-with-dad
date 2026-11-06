# 드래곤 정식 에셋

`source/`의 PNG가 앱 원화의 정식 원본이다. 앉기 두 프레임은 1차 시험 연결본이다. 앱 배포와 이미지 재생성은 `plans/`를 읽지 않는다. 기획 폴더의 이미지와 독립 미리보기는 제작 이력이다.

| 정식 원본 | 제작 당시 위치 | 용도 |
| --- | --- | --- |
| `source/eggs/*.png` | `plans/archive/avatar-customization/dragon-assets/eggs/` | 알 3종 |
| `source/backgrounds/*.png` | 같은 dragon-assets의 `backgrounds/` | 배경 4종 |
| `source/props/*.png` | 같은 dragon-assets의 `props/` | 석비·용암 수정 |
| `source/baby/*.png` | `plans/archive/avatar-customization/baby/original-cutouts/` | 무속성·불·번개·얼음, 눈 감기·들숨 |
| `source/adult-fire/*.png` | dragon-assets의 `fire-dragon/transparent/` | 성체 기본·동작 7장 |
| `source/effects/fire-stream.png` | dragon-assets의 `fire-dragon/effects/fire-stream-transparent.png` | 불길 |

`npm run assets:dragons`는 Sharp 0.34.5로 `public/assets/dragons/`에 WebP 34개를 생성한다. `npm run build`도 prebuild에서 같은 작업을 실행한다. PNG 원본과 배포 WebP를 함께 저장소에 포함한다. 변환은 리사이즈와 WebP 인코딩뿐이며 디자인을 재생성하지 않는다.

무속성 아기의 `walk-bde.png`는 사용자가 독립 미리보기에서 선택한 B→D→E 순서의 2400×620 투명 시트다. B는 `Gemini_Generated_Image_7y11al7y11al7y11.png` 2번, D는 `Gemini_Generated_Image_l8aeoml8aeoml8ae.png` 4번, E는 `Gemini_Generated_Image_flyrscflyrscflyr.png` 3번이다(왼쪽 위부터 가로 순서). 연결 성분으로 온전한 실루엣을 분리하고 흰 배경 경계를 정리했다. 각 자세는 800×620 캔버스에서 높이 550px, 발끝 y=580으로 맞췄다. 승인된 `tmp_image/walk-candidates-20261106/frame-{2,4,5}.png`를 그대로 이어 붙였으며 WebP는 무손실로 생성한다. 드래그 이동 중 5fps(주기 0.6초)로 즉시 교체하며 서기 자세나 교차 페이드는 넣지 않는다. 이전 `walk-3.png`, `walk-4.png`는 보존하지만 앱과 새 캐시에서는 사용하지 않는다. `sit-2.png`, `sit-3.png`은 `tmp_image/앉기/sit-transition-preview.html`의 마지막 두 시험 자세에서 흰 배경과 인접 조각을 제거한 1차 연결본이다. 움직임 줄이기 설정에서는 걷기 대신 정지 원화를 표시한다.

- 알·아기는 너비 1024px, 배경은 1600px, 소품은 640px, 성체·불길은 1200px 이하.
- `withoutEnlargement: true`, `quality: 90`, `alphaQuality: 100`으로 알파를 보존한다.
- 아기의 `lightning.png`는 앱 속성명에 맞춰 `baby/thunder.webp`로 출력한다.
- 아기 눈 깜빡임·호흡은 앱에서 자동 재생한다. 성체 액션 프레임·효과는 준비되어 있으나 스킬 버튼은 후속 작업이다.
- 청소년과 불 이외 성체는 아직 전용 원화가 없어 기존 `public/assets/dragons/dragons-v2.png`를 사용한다.

이미지는 Next가 정적 파일로 제공한다. DB에는 이미지 바이트·base64·원본 PNG를 저장하지 않으며 카탈로그의 ID·이름·kind·art 식별자와 드래곤의 선택 ID·배치 좌표만 저장한다.

## 아기 원화 확정 · 2026-11-04

알 부화 후 사용할 아기는 승인된 픽셀 분리본 6장으로 확정했다. 정식 PNG는 승인본과 바이트 단위로 동일한 2048×2048이며 원본 구도·좌표·불투명 픽셀의 RGB를 보존한다. 이전 `baby/transparent/`와 `baby/aligned/`는 앱 원본으로 사용하지 않는다.

부화 후 속성 선택 전에는 neutral, 불·번개·얼음 선택 후에는 fire·thunder·ice WebP를 표시한다. PNG 원본의 lightning 이름만 WebP 출력에서 thunder로 대응한다. blink·breathe도 같은 캔버스로 정식 보관했지만 이번 이관은 동작 재생 설정을 변경하지 않는다. 아기 단계는 기존 성장 규칙인 1~17일을 유지한다.

## 속성별 아기 움직임 · 2026-11-05

승인된 `baby/element-cutouts/` 6장을 정식 원본으로 이관했다. 원래 파일명과 실제 내용은 달라 원본 이름을 바꾸지 않고 다음과 같이 대응한다. 세 들숨은 미세한 동작으로 검토 후 승인됐다.

| 정식 이름 | 제공 원본 |
| --- | --- |
| fire-blink | `화_숨.png` |
| fire-breathe | `화_눈.png` |
| lightning-blink | `번개_숨.png` |
| lightning-breathe | `얼음_눈.png` |
| ice-blink | `얼음_숨.png` |
| ice-breathe | `번개_눈.png` |

속성별 움직임도 기존 무속성 아기와 동일한 4초 호흡·6초 눈 깜빡임과 움직임 줄이기 설정을 따른다. lightning 파일은 앱 경로에서 thunder로 출력한다.
# 개발용 쇼케이스

`npm run dev` 실행 후 `http://localhost:3000/dev/dragon-showcase`에서 실제 앱 장면 두 개를 비교할 수 있다. 개발 서버 전용이며 운영 빌드에서는 사용할 수 없다. 성장 단계·속성·동작을 추가하면 `app/dev/dragon-showcase/showcase.tsx`의 선택지와 동작 안내도 함께 갱신한다. 이전 버전의 자동 보관 기능은 없다.

