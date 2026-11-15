import test from "node:test";
import assert from "node:assert/strict";
import { cloneCycleMs, clonePose, createCloneRound, createClonePositions, createRandomCloneGame, clonePlayback, type ClonePattern } from "../lib/dragon-clone";
import { supportsDragonClone } from "../lib/dragon-data";

test("모든 행동과 좌우 조합을 추첨하고 정답은 항상 하나다", () => {
  // Given: seeded randomness plus both constant boundary generators.
  let seed = 17;
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  const actions = new Set<string>();
  const directions = new Set<string>();
  const patterns = new Set<string>();
  // When
  for (const generator of [() => 0, () => .999, ...Array.from({ length: 200 }, () => random)]) {
    const round = createCloneRound(["clone", "fly", "tail-attack", "breath"], generator);
    const real = round.find(pattern => pattern.real)!;
    patterns.add(JSON.stringify(real.steps));
    for (const step of real.steps) { actions.add(step.action); directions.add(step.facing); }
    // Then
    assert.equal(round.length, 3);
    assert.equal(round.filter(pattern => pattern.real).length, 1);
    assert.equal(new Set(round.map(pattern => JSON.stringify(pattern.steps))).size, 3);
  }
  assert.deepEqual([...actions].sort(), ["blink", "breath", "fly", "sit", "stand", "tail-attack", "walk"]);
  assert.deepEqual([...directions].sort(), ["left", "right"]);
  assert.ok(patterns.size > 150);
});

test("빈 스킬 목록에서는 기본 행동만 쓰며 새 놀이는 패턴·정답 자리·배치를 바꾼다", () => {
  // Given / When
  const first = createRandomCloneGame(() => 0);
  const last = createRandomCloneGame(() => .999);
  // Then
  assert.notDeepEqual(first.round, last.round);
  assert.notDeepEqual(first.positions, last.positions);
  assert.notEqual(first.round.findIndex(pattern => pattern.real), last.round.findIndex(pattern => pattern.real));
  for (const pattern of [...first.round, ...last.round]) for (const step of pattern.steps) {
    assert.ok(["stand", "blink", "sit", "walk"].includes(step.action));
  }
});

test("세 동작을 끝까지 보여준 뒤 소멸·생성하고 관찰을 반복한다", () => {
  // Given / When
  const states = [8999, 9000, 9599, 9600, 10199, 10200, 20400].map(clonePlayback);
  // Then
  assert.deepEqual(states.map(state => state.phase), ["clue", "vanish", "vanish", "emerge", "emerge", "observe", "observe"]);
  assert.equal(states[5].elapsed, 0);
  assert.equal(states[6].elapsed, 0);
});

test("무작위 배치는 세 마리를 장면 안에 유지하고 서로의 터치 영역을 겹치지 않는다", () => {
  // Given: reproducible samples across many layouts, including constant randomness.
  let seed = 17;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const generators = [() => 0, () => .999, ...Array.from({ length: 100 }, () => random)];
  // When
  const layouts = generators.map(generator => createClonePositions(generator));
  // Then: the square actor is 24% wide and 42.7% high in a 16:9 habitat.
  for (const layout of layouts) {
    assert.equal(layout.length, 3);
    for (const [index, position] of layout.entries()) {
      assert.ok(position.x >= 14 && position.x <= 86);
      assert.ok(position.y >= 24 && position.y <= 76);
      for (const other of layout.slice(index + 1)) assert.ok(Math.abs(position.x - other.x) >= 28 || Math.abs(position.y - other.y) >= 46);
    }
  }
  assert.notDeepEqual(layouts[0], layouts[1]);
  assert.ok(new Set(layouts.map(layout => JSON.stringify(layout))).size > 90);
});

test("동작 순서·방향·깜빡임·앉기 경계를 지키고 같은 패턴을 반복한다", () => {
  // Given
  const pattern: ClonePattern = { real: true, steps: [{ action: "blink", facing: "left" }, { action: "sit", facing: "right" }, { action: "walk", facing: "left" }] };
  // When
  const at = (time: number) => clonePose(pattern, time);
  // Then
  assert.equal(at(499).blinking, false);
  assert.equal(at(500).blinking, true);
  assert.equal(at(800).blinking, false);
  assert.equal(at(1200).blinking, true);
  assert.equal(at(1500).blinking, false);
  assert.equal(at(2999).facing, "left");
  assert.equal(at(3000).facing, "right");
  assert.equal(at(4000).frame, 4);
  assert.equal(at(5999).frame, 0);
  assert.equal(at(6000).action, "walk");
  assert.equal(at(9000).action, "stand");
  assert.deepEqual(at(cloneCycleMs + 500), at(500));
  assert.equal(clonePose(pattern, 3000, true).frame, 4);
  assert.equal(clonePose(pattern, 6000, true).frame, 0);
});

for (const element of ["fire", "thunder"] as const) {
  test(`${element} 스킬은 전체 동작을 재생하며 움직임 줄이기에서도 구별된다`, () => {
    // Given
    const pattern: ClonePattern = { real: true, steps: [{ action: "fly", facing: "left" }, { action: "tail-attack", facing: "right" }, { action: "breath", facing: "left" }] };
    // When
    const poses = Array.from({ length: 90 }, (_, i) => clonePose(pattern, i * 100, false, element));
    // Then
    assert.equal(poses[15].motion, "hover");
    assert.equal(poses[29].motion, "takeoff");
    assert.ok(poses[40].frame > poses[30].frame);
    assert.ok(poses[80].frame > poses[60].frame);
    for (const time of [0, 3000, 6000]) {
      assert.equal(clonePose(pattern, time, true, element).action, pattern.steps[time / 3000].action);
      assert.equal(clonePose(pattern, time, true, element).facing, pattern.steps[time / 3000].facing);
    }
  });
}

for (const element of [null, "fire", "thunder", "ice"] as const) {
  for (const days of [0, 1, 17, 18, 30]) {
    test(`분신 자격: ${element}/${days}일`, () => {
      // Given
      const dragon = { element, days };
      // When
      const supported = supportsDragonClone(dragon);
      // Then
      assert.equal(supported, (element === "fire" || element === "thunder") && days >= 1 && days <= 17);
    });
  }
}
