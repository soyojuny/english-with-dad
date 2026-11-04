# 드래곤 공간 합성 자료

원본은 기존 위치에 그대로 보존했다. 알아보기 쉬운 이름의 배경은 원본 복사이며, 투명 PNG는 내장 `imagegen`의 배경 분리 파생물이다. 이미지 생성 과정의 미세한 윤곽·색상 변화가 있을 수 있다.

## 바로 보기

- [용암의 성역](fire-dragon/habitat-preview.html): 배경 4종, 성체 대기·포효·불 뿜기, 석비·수정 표시 및 배치 비교.
- 기존 [흰 배경 동작 시험](fire-dragon/combined-preview.html)과 개별 동작 시험은 그대로 유지한다.
- Chrome에서 `file://wsl.localhost/Ubuntu/home/joon/workspace/english-with-dad/plans/active/avatar-customization/dragon-assets/fire-dragon/habitat-preview.html`을 연다.

## 원본 대응

| 원본 PNG (`Gemini_Generated_Image_` 접두사) | 보존 복사 / 투명 파생 파일 |
| --- | --- |
| `8k6k438k6k438k6k.png` | `backgrounds/lava-central-volcano.png` |
| `66lqua66lqua66lq.png` | `backgrounds/lava-open-foreground.png` (기본) |
| `xkhlodxkhlodxkhl.png` | `backgrounds/lava-waterfall.png` |
| `n25iumn25iumn25i.png` | `backgrounds/lava-stone-platform.png` |
| `nqov7dnqov7dnqov.png` | `props/ancient-dragon-relic.png` |
| `pfdgbzpfdgbzpfdg.png` | `props/lava-crystal.png` |

새 파일 3개 중 첫 번째는 둥지가 아닌 넓은 바닥을 가진 배경이다. 별도의 화산암 둥지는 제공되지 않아 임의로 생성하지 않았다. 석비의 원본 체크무늬는 실제 투명도가 아닌 그림에 포함된 배경이어서 제거했다.

`fire-dragon/transparent/`에는 `concepts/adult.png`와 `motions/idle/`, `motions/roar/`, `motions/fire-breath/`의 파일명에 대응하는 투명 파생 PNG 8장을 저장했다. 원래 동작 파일은 수정하지 않았다.

## 합성 범위

배경 → 석비 → 접지 그림자·드래곤 → 전경 수정 → 불길 순서다. 가로 16:9 장면의 드래곤 크기와 위치를 고정해 세로 화면에서도 같은 구도를 유지한다. 소품 위치 버튼은 두 개의 시험 배치를 번갈아 보여준다. 저장·획득·자유 편집 기능과 연결하지 않는다.

호흡은 두 정지 그림의 교차 전환, 눈 깜빡임은 눈 주변만 덮는 방식, 포효는 프레임 순서 재생, 불길은 기존 투명 이미지의 가로 확장이다. 완성된 연속 프레임 애니메이션이나 실제 앱 기능을 뜻하지 않는다. 소리는 없다.

## 검증 실행

저장소 루트에서 `node plans/active/avatar-customization/dragon-assets/fire-dragon/check-habitat.cjs` 실행. 로컬 임시 HTTP 서버와 Playwright Chromium을 사용하고 종료 시 닫는다. 태블릿 가로·세로 및 작은 화면, 이미지 로딩, 배경·소품 전환, 동작 잠금·복귀, 일시정지, 모션 감소 설정, 이미지 누락 오류를 확인한다.

배경 분리 프롬프트와 도구 정보는 [extraction-prompts.md](extraction-prompts.md), 최신 검증 결과와 제한은 [../review.md](../review.md)에 기록한다.
