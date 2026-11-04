# 투명 배경 분리 · 2026-11-04

내장 `image_gen.imagegen` 사용. 모든 호출에 원본 로컬 경로를 `referenced_image_paths`로 전달하고 `transparent_background: true`를 지정했다. CLI/API fallback은 사용하지 않았다. 새 디자인 생성 없이 배경만 분리하도록 요청했다.

## 성체 기본 자세

입력: `fire-dragon/concepts/adult.png`. 출력: `fire-dragon/transparent/adult.png`.

```text
Use case: background-extraction. Edit target: supplied adult fire dragon. Remove ONLY the pale background, including spaces between horns, wings, tail and legs. Output a genuine transparent PNG, same complete dragon, same pose and framing/aspect ratio. Preserve every scale, black outline, all four feet, both wings including the gray far wing and gray far leg, horns and tail. Do not redesign, recolor, add or remove anatomy, crop or reposition the dragon. No ground shadow or new scenery. Keep original canvas registration for animation compositing.
```

## 동작 프레임 7장

아래 `{path}`를 각각의 원본 상대 경로로 대입해 한 장씩 호출했다. 출력은 `fire-dragon/transparent/` 아래 같은 파일명이다.

- `motions/idle/blink-closed.png`
- `motions/idle/breathe-in.png`
- `motions/roar/01-mouth-opening.png`
- `motions/roar/02-forward.png`
- `motions/roar/03-head-rising.png`
- `motions/roar/04-head-raised.png`
- `motions/fire-breath/charge.png`

```text
Use case: background-extraction. Edit target: supplied fire dragon animation frame {path}. Remove ONLY the pale background including enclosed spaces between horns, wings, tail and legs. Genuine transparent PNG. Preserve EXACT existing pose, expression, eye state (closed if closed), mouth opening, anatomy, both wings including gray far wing, all four legs including gray far leg, dark scales and outlines, orange glow. Do not redesign, add shadows, change position, zoom or crop. Maintain original framing/aspect ratio and registration for animation compositing. Whole creature fully visible.
```

## 주변 소품 2장

입력/출력 대응은 README의 원본 대응표를 따른다. `{detail}`에 아래 두 문장을 각각 대입했다.

```text
ancient stone dragon relief monolith, including its complete base. Remove the baked-in white/gray checkerboard outside the object. Keep the stone carving and glowing cracks unchanged.
```

```text
lava crystal cluster, including its dark rocky base. Remove the light gray background. Keep the sharp crystals and internal orange lava unchanged.
```

```text
Use case: background-extraction. Edit target: supplied {detail} Produce genuine transparent PNG, isolated original object. Preserve original composition, shape, palette, black contours and detail. Do not add objects or scenery, redesign, or crop. Remove surrounding background only.
```
