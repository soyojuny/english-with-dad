# 드래곤 앱 원화

배포용 WebP는 `assets/dragons/source/`의 정식 PNG에서 생성한다. `npm run assets:dragons`와 `npm run build`의 prebuild가 같은 변환을 수행하며 `plans/`를 참조하지 않는다. 정식 원본과 제작 이력 대응은 `assets/dragons/README.md`를 따른다. 기존 `dragons-v2.png`는 미제작 성장·속성 모습에 계속 사용한다.

| 앱 파일 | 원본 (assets/dragons/source 기준) | 변환 너비 |
| --- | --- | --- |
| `eggs/{spotted,striped,diamond}.webp` | `eggs/`의 같은 이름 PNG | 1024px |
| `habitats/lava-*.webp` | `backgrounds/`의 같은 이름 PNG | 1600px |
| `props/ancient-dragon-relic.webp`, `props/lava-crystal.webp` | `props/`의 같은 이름 PNG | 640px |
| `baby/*.webp` | 승인된 2048×2048 `baby/` PNG (thunder는 lightning) | 1024px |
| `adult-fire.webp` | `adult-fire/adult.png` | 1200px |
| `adult-fire/*.webp` | `adult-fire/`의 같은 이름 PNG | 1200px |
| `effects/fire-stream.webp` | `effects/fire-stream.png` | 1200px |

Sharp로 `resize({ width, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 })` 변환한다. 알은 정렬된 투명 캔버스를 유지하고 아기·성체·소품도 알파를 보존한다. 디자인을 재생성하지 않는다.

`lib/dragon-art.ts`가 앱의 art 대응을 제공한다. 기본 원화 14개와 기존 atlas는 서비스워커 `ewd-reading-v5`의 appShell에 포함된다. 후속 액션 프레임은 캐시 목록에 추가하지 않았다. 원화를 추가하면 `public/sw.js`, manifest와 `scripts/check-pwa.mjs`의 계약도 함께 확인한다.
