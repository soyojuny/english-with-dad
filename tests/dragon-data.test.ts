import test from "node:test";
import assert from "node:assert/strict";
import { availableDragonItems, clampDragonPosition, defaultDragonDecor, dragonSprite, dragonStage, missingDragonLearning, supportsDragonFlight, supportsDragonTailAttack } from "../lib/dragon-data";
import type { DragonItem } from "../lib/dragon-types";
import { emptyReadingData } from "../lib/reading-data";
import type { Assignment } from "../lib/reading-types";

for (const element of [null, "fire", "thunder", "ice"] as const) {
for (const [days, expected] of [[0, false], [1, true], [17, true], [18, false], [30, false]] as const) {
  test(`날기 지원 경계: ${element ?? "무속성"} ${days}일`, () => {
    // Given
    const dragon = { days, element };
    // When
    const result = supportsDragonFlight(dragon);
    // Then
    assert.equal(result, expected && (element === null || element === "fire" || element === "thunder"));
  });
}
}

for (const [days, expected] of [[0, "알"], [1, "아기 드래곤"], [6, "아기 드래곤"], [17, "아기 드래곤"], [18, "청소년 드래곤"], [29, "청소년 드래곤"], [30, "성체 드래곤"]] as const) {
  test(`성장 경계: ${days}일은 ${expected}다`, () => {
    // Given
    const day = days;
    // When
    const result = dragonStage(day);
    // Then
    assert.equal(result, expected);
  });
}
test("무속성도 청소년·성체 원화로 성장하며 늦은 속성 선택은 동일 단계를 사용한다", () => {
  // Given
  const dragon = { egg: 0, days: 30, element: null };
  // When
  const neutral = dragonSprite(dragon);
  const fire = dragonSprite({ ...dragon, element: "fire" });
  // Then
  assert.equal(neutral.backgroundPosition.split(' ')[0], fire.backgroundPosition.split(' ')[0]);
  assert.equal(neutral.filter, "grayscale(1) sepia(.15)");
  assert.notEqual(neutral.backgroundPosition, dragonSprite({ ...dragon, days: 18 }).backgroundPosition);
});
test("자유 배치는 정상 좌표를 유지하고 경계 밖 드래그를 장면 안에 제한한다", () => {
  // Given
  const positions = [[50, 78], [-100, 200], [15, 85]];
  // When
  const results = positions.map(([x, y]) => clampDragonPosition(x, y));
  // Then
  assert.deepEqual(results, [{ x: 50, y: 78 }, { x: 15, y: 85 }, { x: 15, y: 85 }]);
});
test("각 드래곤의 기본 배치는 서로 독립적이다", () => {
  // Given
  const first = defaultDragonDecor(); const second = defaultDragonDecor();
  // When
  first.left.x = 70;
  // Then
  assert.equal(second.left.x, 82);
});
test("첫 배치는 둥지 없이 제공 배경과 장식으로 구성한다", () => {
  // Given
  const expectedSlots = ["background", "left", "right"];
  // When
  const decor = defaultDragonDecor();
  // Then
  assert.deepEqual(Object.keys(decor), expectedSlots);
  assert.equal(decor.background.itemId, "lava-open-foreground");
  assert.equal(decor.left.itemId, "ancient-dragon-relic");
  assert.equal(decor.right.itemId, "lava-crystal");
});
test("제공하지 않는 ID·잘못된 원화·유료 항목은 꾸미기 목록에 노출하지 않는다", () => {
  // Given
  const crystal: DragonItem = { id: "lava-crystal", name: "용암 수정", kind: "prop", art: "lava-crystal", free: true };
  const catalog: DragonItem[] = [crystal, { ...crystal, id: "flowers" }, { ...crystal, art: "gem" }, { ...crystal, free: false }, { ...crystal, kind: "background" }];
  // When
  const result = availableDragonItems(catalog);
  // Then
  assert.deepEqual(result, [crystal]);
  assert.deepEqual(availableDragonItems([]), []);
});
const assignment: Assignment = { id: "a", childId: "c", bookId: "b", date: "2026-11-03", activityCategory: "focusListen", tasks: ["self"], taskCounts: { self: 2 }, quizEnabled: true, quizScore: null };
test("남은 학습은 목표 횟수와 미입력 퀴즈를 각각 안내한다", () => {
  // Given
  const data = { ...emptyReadingData, completions: { 'a:self': { count: 1, completedAt: '', minutes: 5, audioOpenedAt: null } } };
  // When
  const result = missingDragonLearning(data, [assignment]);
  // Then
  assert.deepEqual(result.map(({ task, remaining }) => [task, remaining]), [["self", 1], ["quiz", 1]]);
});
test("FAIL도 기록 완료이며 목표 초과 횟수는 남은 학습이 아니다", () => {
  // Given
  const data = { ...emptyReadingData, completions: { 'a:self': { count: 3, completedAt: '', minutes: 5, audioOpenedAt: null } } };
  // When
  const result = missingDragonLearning(data, [{ ...assignment, quizScore: "FAIL" }]);
  // Then
  assert.deepEqual(result, []);
});

for (const [days, element, expected] of [[0, 'thunder', false], [1, 'thunder', true], [17, 'thunder', true], [18, 'thunder', false], [30, 'thunder', false], [6, null, false], [6, 'fire', false], [6, 'ice', false]] as const) {
  test(`꼬리 공격 지원 경계 ${days}일/${element ?? '무속성'}는 ${expected}`, () => {
    // Given
    const dragon = { days, element };
    // When
    const actual = supportsDragonTailAttack(dragon);
    // Then
    assert.equal(actual, expected);
  });
}
