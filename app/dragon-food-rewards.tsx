import { availableDragonFoods, dragonFoodFrames } from "../lib/dragon-food";
import type { DragonController } from "./use-dragon-world";

export function DragonFoodRewards({ controller }: { controller: DragonController }) {
  const world = controller.world!;
  const foods = availableDragonFoods(world.catalog);
  if (!foods.length) return null;
  return <section className="dragon-food-rewards" aria-label="먹이 보상 선택"><h4>드래곤 먹이</h4>
    <p>3일 달성마다 받는 선택 기회 1개로 먹이 하나를 골라요. 한 번 고르면 계속 줄 수 있어요.</p>
    <p>불·번개 아기 드래곤에게 먹이를 줄 수 있어요. 기능과 같은 선택 기회를 사용해요.</p>
    <div className="dragon-food-options">{foods.map(food => {
      const frame = dragonFoodFrames[food.states[0]], [rx, ry] = frame.rect, [x, y, w, h] = frame.contentRect;
      return <button key={food.id} type="button" disabled={controller.pending || world.owned.includes(food.id) || world.credits < 1}
        onClick={() => void controller.run({ action: "claim", itemId: food.id })}>
        <svg className="dragon-food-thumb" viewBox={`${rx + x - 32} ${ry + y - 32} ${w + 64} ${h + 64}`} aria-hidden="true"><image href={`/assets/dragons/food/${frame.group}.webp`} width="4608" height="3072" /></svg>
        {food.name}<small>{world.owned.includes(food.id) ? "받았어요 · 계속 사용" : "받기 · 기회 1개"}</small></button>;
    })}</div>
  </section>;
}
