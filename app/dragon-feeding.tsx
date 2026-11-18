import { dragonFoodFrames, feedingSprites, type FoodDefinition } from "../lib/dragon-food";

export function DragonFeedingSprite({ element, food, step, progress, frame, active }: {
  element: "fire" | "thunder"; food: FoodDefinition; step: number; progress: number; frame: number; active: boolean;
}) {
  return <span className={`dragon-feeding${active ? " is-eating" : " is-finished"}`}>
    <svg className="dragon-feeding-art" viewBox="0 0 960 800" role="img" aria-label={active ? `${food.name} 먹는 아기 드래곤` : "먹고 남은 그릇과 음식"}>
      {active && <svg viewBox={`${frame % 3 * 960} ${Math.floor(frame / 3) * 800} 960 800`} width="960" height="800">
        <image href={`/assets/dragons/baby/${element}-eat.webp`} width="2880" height="2400" />
      </svg>}
      {feedingSprites(food, step, progress, element).map(sprite => {
        const f = dragonFoodFrames[sprite.key], [rx, ry] = f.rect, [x, y, w, h] = f.contentRect, padding = 32;
        const sw = w + padding * 2, sh = h + padding * 2;
        return <svg key={sprite.role} data-role={sprite.role} data-state={sprite.key}
          viewBox={`${rx + x - padding} ${ry + y - padding} ${sw} ${sh}`}
          x={Math.round(sprite.x - sw * sprite.scale / 2)} y={Math.round(sprite.bottom - (h + padding) * sprite.scale)} width={sw * sprite.scale} height={sh * sprite.scale}>
          <image href={`/assets/dragons/food/${f.group}.webp`} width="4608" height="3072" />
        </svg>;
      })}
    </svg>
  </span>;
}
