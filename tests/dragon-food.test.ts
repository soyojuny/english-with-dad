import test from "node:test";
import assert from "node:assert/strict";
import { availableDragonFoods, dragonFoods, dragonFoodFrames, feedingFrames, feedingSprites, ownedDragonFoods, supportsDragonFeeding } from "../lib/dragon-food";
import type { DragonItem } from "../lib/dragon-types";

for (const element of [null, "fire", "thunder", "ice"] as const) for (const days of [0, 1, 17, 18, 30]) {
  test(`먹기 지원 경계 ${element}/${days}`, () => {
    // Given
    const dragon = { element, days };
    // When
    const supported = supportsDragonFeeding(dragon);
    // Then
    assert.equal(supported, days > 0 && days < 18 && (element === "fire" || element === "thunder"));
  });
}

test("지원하지 않는 ID와 잘못된 카탈로그 종류·원화를 해금 목록에 넣지 않는다", () => {
  // Given
  const catalog: DragonItem[] = dragonFoods.map(food => ({ id: food.id, name: food.name, kind: "food", art: food.id, free: false }));
  const wrong: DragonItem[] = [{ ...catalog[0], art: "wrong" }, { ...catalog[1], kind: "prop" }, { ...catalog[2], free: true }, { ...catalog[3], id: "unknown" }];
  // When
  const available = availableDragonFoods(catalog), invalid = availableDragonFoods(wrong);
  // Then
  assert.equal(available.length, 6);
  assert.equal(invalid.length, 0);
  assert.deepEqual(ownedDragonFoods(["unknown", "lava-apple", "lava-apple"]).map(food => food.id), ["lava-apple"]);
});

for (const food of dragonFoods) test(`${food.name}은 첫 한입·세 번 씹기·남은 음식 규칙을 따른다`, () => {
  // Given
  const states = [0, 2, 3, 5, 7, 13].map(step => feedingSprites(food, step, 1, "fire"));
  // When
  const mouthFood = states.map(sprites => sprites.find(sprite => sprite.role === "food")?.key);
  // Then
  assert.equal(feedingFrames.filter(frame => frame === 3).length, 3);
  assert.equal(new Set(feedingFrames).size, 9);
  assert.equal(mouthFood[0], undefined);
  assert.equal(mouthFood[1], food.states[food.id === "thunder-grapes" ? 1 : 0]);
  assert.equal(mouthFood[2], food.states[food.id === "thunder-grapes" ? 2 : 1]);
  assert.equal(mouthFood[3], mouthFood[2]);
  assert.equal(mouthFood[4], food.id === "bone-meat" ? "bone" : undefined);
  if (food.id === "thunder-grapes") assert.equal(states[5].find(sprite => sprite.role === "bunch")?.key, "grapesAfterOne");
  for (const sprites of states) for (const sprite of sprites) assert.ok(dragonFoodFrames[sprite.key]);
});
