# 드래곤 원화 v1 · 여백 보완본 v2

- 생성: built-in `image_gen`, 2026-10-25.
- 최종 사용 파일: `dragons-v2.png`. 투명 배경 4 × 4 아틀라스. CSS로 각 칸을 표시한다. `dragons.png`는 최초 생성본이며 칸 경계의 날개 잘림 때문에 여백을 보완했다.
- 용도: 디자인 검토용 2.5D 원화. 실제 앱용 레이어 분리·날개 애니메이션은 미제작이다.
- 알 3종은 무늬만 다르고 속성을 결정하지 않는 추천안이다. 18일 중간 성장도 검토안이다.
- 생성 프롬프트:

```text
Use case: stylized-concept.
Asset type: a SINGLE sprite atlas for an interactive dragon-growth design prototype, transparent PNG. Create exactly 4 columns and 4 rows of evenly sized square cells, all cells aligned in a strict regular grid, no gutters or borders. Each cell has one isolated full-body 2.5D dragon or egg, centered with generous transparent padding. No sprite crosses its cell. No text, labels, watermark, scenery, floor or shadow under the feet.
Art direction: premium illustrated fantasy game, sculpted three-quarter view, beautiful detailed scales, broad membranous wings, curved ivory horns, long curling tail, tactile soft rim lighting, charming but powerful, not flat icons, not childish rubber toys. Mature dragons have long necks, proud upright stance, impressive large wings, formidable but friendly faces. Facing left three-quarter, consistent species and identity.
ROW 1: column 1 a pale ivory dragon egg with delicate gold freckle markings; column 2 a pale ivory dragon egg with gold wavy stripe markings; column 3 a pale ivory dragon egg with gold diamond markings; column 4 a small unaligned neutral pearl-ivory baby dragon with little horns and short wings.
ROW 2: column 1 a FIRE young dragon (6 days, red-orange scales, small wings); column 2 FIRE adolescent dragon (18 days, bigger body and horns, half open wings); column 3 FIRE adult dragon (30 days, majestic red scales, magnificent orange-red wings, subtle tail flame); column 4 repeat the neutral pearl-ivory baby dragon, slightly playful pose.
ROW 3: column 1 a THUNDER young dragon (6 days, dark charcoal-violet scales, violet glowing accents); column 2 THUNDER adolescent (18 days, longer neck, bigger wings); column 3 THUNDER adult (30 days, magnificent black-violet wings, purple lightning around wing tips); column 4 repeat the neutral pearl-ivory baby dragon, sleeping pose.
ROW 4: column 1 an ICE young dragon (6 days, icy pale blue scales, little crystal horns); column 2 ICE adolescent (18 days, bigger crystal horns, wider icy wings); column 3 ICE adult (30 days, majestic blue-white dragon, crystalline wing tips and frost, long proud neck); column 4 repeat the neutral pearl-ivory baby dragon, happy pose.
Keep the young dragon noticeably younger than the adolescent and adult. Every dragon fills about 80 percent of its own cell, shown completely including wings and tail. Actual alpha transparency. High resolution square atlas.
```

## 여백 보완 프롬프트

```text
Edit this sprite atlas to fix its layout for CSS sprites. Preserve the SAME dragon designs, colours, 2.5D detailed illustration style, and same cell ordering. CRITICAL: exactly 4 columns and 4 rows on an exactly square canvas, 16 equal-sized square cells. Reposition and scale EACH isolated sprite so its ENTIRE silhouette, wing tips, tail, flames, lightning and shadows are fully inside its own cell's central 65% width and central 65% height. Leave at least 17.5% transparent padding on ALL FOUR SIDES inside EVERY cell. No part whatsoever may cross a cell boundary. Make all sprites SMALLER, especially adults. Do not draw grid lines. Do not fill the transparent space with anything. True alpha transparency. Row 1: three eggs, ivory baby. Row 2: fire young, fire adolescent, fire adult, ivory baby. Row 3: thunder young, thunder adolescent, thunder adult, sleeping ivory baby. Row 4: ice young, ice adolescent, ice adult, happy ivory baby. Artwork can be smaller; strict equal square grid, ample padding, fully separated and COMPLETE silhouettes are more important than filling the canvas.
```
