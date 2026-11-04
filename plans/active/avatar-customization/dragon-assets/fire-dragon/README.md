# 불 드래곤 제작 시안

Gemini Nano Banana로 만든 원본 디자인과 동작 시안이다. 투명 불길은 내장 imagegen으로 배경을 분리한 파생 시안이며 원본과 세부 형태가 다를 수 있다.

- `concepts/`: 아기·청소년·성체 기준 그림.
- `motions/idle/`: 눈 감기, 들숨 시안. 기본 자세는 `concepts/adult.png`.
- `motions/roar/`: 입 열기 → 정면 포효 → 고개 들기 → 높은 포효 순서.
- `motions/fire-breath/`: 입에 불을 모은 자세.
- `effects/`: 사용 중인 불길 원본 및 투명 파생 이미지.
- `references/`: 대안과 초기 시안. 삭제하지 않고 비교용으로 보관한다.
- `combined-preview.html`: 대기·포효·불 뿜기 통합 미리보기.

현재 그림은 프레임 제작 가능성을 확인하는 시안이다. 기존 시험은 불투명 원본을 사용한다. `transparent/`에는 성체 기본 자세와 동작 7장의 투명 파생 파일을 추가했으며, [용암 배경 합성](habitat-preview.html)에서 배경·소품과 함께 확인한다. 호흡은 교차 전환, 포효는 정지 그림 순서 재생, 불길은 한 장의 크기 변화로 시험한다. 실제 앱과 연결되지 않는다. 원본 대응과 분리 프롬프트는 [상위 README](../README.md)를 참고한다.

## 원본 파일명 대응

- `adult-concept.png` → `concepts/adult.png`
- `juvenile-concept.png` → `concepts/juvenile.png`
- `baby-concept.png` → `concepts/baby.png`
- `Gemini_Generated_Image_v0awcrv0awcrv0aw.png` → `motions/idle/blink-closed.png`
- `Gemini_Generated_Image_4k3a514k3a514k3a.png` → `motions/idle/breathe-in.png`
- `Gemini_Generated_Image_baueftbaueftbaue.png` → `motions/roar/01-mouth-opening.png`
- `Gemini_Generated_Image_wzomr3wzomr3wzom.png` → `motions/roar/02-forward.png`
- `Gemini_Generated_Image_f4hyrcf4hyrcf4hy.png` → `motions/roar/03-head-rising.png`
- `Gemini_Generated_Image_kf4sejkf4sejkf4s.png` → `motions/roar/04-head-raised.png`
- `Gemini_Generated_Image_1dtqzk1dtqzk1dtq.png` → `motions/fire-breath/charge.png`
- `Gemini_Generated_Image_g8jyctg8jyctg8jy.png` → `effects/fire-stream-source.png`
- `fire-breath-stream-preview.png` → `effects/fire-stream-transparent.png`
- `Gemini_Generated_Image_dh8k56dh8k56dh8k.png` → `references/fire-burst-source.png`
- `fire-breath-effect-preview.png` → `references/fire-burst-transparent.png`
- `Gemini_Generated_Image_q6izguq6izguq6iz.png` → `references/breathe-in-with-embers.png`
