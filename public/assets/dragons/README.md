# 드래곤 배포 에셋

이 폴더에는 정식 PNG에서 생성하는 WebP 36개와 성장·속성 대체용 `dragons-v2.png`가 있습니다. `npm run assets:dragons`와 `npm run build`의 prebuild가 같은 변환을 수행합니다. 빌드는 `plans/`나 `tmp_image/`에 의존하지 않습니다. 원본 출처와 승인 이력은 `assets/dragons/README.md`에 기록합니다.

| 배포 파일 | 원본 (`assets/dragons/source/` 기준) | 출력 기준 |
| --- | --- | --- |
| `eggs/{spotted,striped,diamond}.webp` | `eggs/`의 같은 이름 PNG | 너비 최대 1024px |
| `habitats/lava-*.webp` | `backgrounds/`의 같은 이름 PNG | 너비 최대 1600px |
| `props/*.webp` | `props/`의 같은 이름 PNG | 너비 최대 640px |
| 아기 기본·눈 깜빡임·호흡 `baby/*.webp` | `baby/`의 같은 이름 PNG (`thunder`는 `lightning`) | 너비 최대 1024px |
| `baby/sit-sequence.webp` | `baby/sit-sequence.png` | 5120×1024px, 무손실 서기→2rus-2→A→B→4ier-1 시트 |
| `baby/fire-sit-sequence.webp` | `baby/fire-sit-sequence.png` | 5120×1024px, 무손실 불 서기→앉기 5자세 시트 |
| `baby/walk-bde.webp` | `baby/walk-bde.png` | 2400×620px, 무손실 B→D→E 시트 |
| `baby/fire-walk-bde.webp` | `baby/fire-walk-bde.png` | 2400×620px, 무손실 불 아기 B→D→E 시트 |
| `baby/thunder-walk-bde.webp` | `baby/thunder-walk-bde.png` | 2400×620px, 무손실 번개 아기 3자세 시트 |
| `baby/ice-walk-bde.webp` | `baby/ice-walk-bde.png` | 2400×620px, 무손실 얼음 아기 3자세 시트 |
| `adult-fire.webp` | `adult-fire/adult.png` | 너비 최대 1200px |
| `adult-fire/*.webp` | `adult-fire/`의 같은 이름 PNG | 너비 최대 1200px, 후속 동작용 |
| `effects/fire-stream.webp` | `effects/fire-stream.png` | 너비 최대 1200px, 후속 효과용 |

Sharp의 `resize({ width, withoutEnlargement: true })`를 사용합니다. 걷기·앉기 시트는 `webp({ lossless: true })`, 나머지는 `webp({ quality: 90, alphaQuality: 100 })`로 출력합니다. 변환 과정에서 디자인을 재생성하지 않습니다.

현재 서비스 워커 캐시는 `ewd-reading-v18`입니다. 불 서기·호흡·깜빡임은 밝은 배경 가장자리의 알파만 정리했으며 RGB는 보존합니다. 불 앉기 시트는 제공 원본의 RGB를 보존하고 알파로 체크 배경만 분리한 정식 PNG에서 재생성합니다. 기본 원화·아기 동작·무속성 및 불·번개·얼음 아기 걷기·무속성 및 불 아기 앉기와 기존 atlas를 준비하며, 후속 성체 동작·불길은 사전 캐시에 넣지 않습니다. 실제 목록은 `public/sw.js`와 `scripts/check-pwa.mjs`를 따릅니다.

이전 `walk-3/4.webp`는 `assets/dragons/archive/baby-walk-v1/webp/`에 보존했습니다. 앱이나 캐시에서 사용하지 않으며 재생성 대상도 아닙니다. 파일을 추가하거나 교체할 때는 빌드 목록, 서비스 워커, manifest와 PWA 검사를 함께 확인합니다.

기존 `baby/sit-2.webp`, `baby/sit-3.webp`는 시험본으로 보존하지만 현재 빌드·앱·캐시에서는 사용하지 않습니다. 앉기 시트는 원본 5자세를 같은 크기의 칸에 정렬하여 300ms씩 표시하고 일어서기는 현재 자세부터 역순으로 표시합니다.
