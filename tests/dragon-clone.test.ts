import test from "node:test";
import assert from "node:assert/strict";
import { cloneCycleMs, clonePose, createCloneRound, createClonePositions, createRandomCloneGame, clonePlayback } from "../lib/dragon-clone";
import { supportsDragonClone } from "../lib/dragon-data";

for (const difficulty of ["easy", "sequence"] as const) {
  test(`${difficulty}: 세 마리 중 단서와 일치하는 드래곤은 하나이고 자리도 바뀐다`, () => {
    // Given
    const first = createCloneRound(difficulty, () => 0);
    const last = createCloneRound(difficulty, () => .999);
    // When
    const matching = first.filter(pattern => pattern.action === "sit" && pattern.blinks === (difficulty === "easy" ? 0 : 2));
    // Then
    assert.equal(first.length, 3);
    assert.equal(matching.length, 1);
    assert.equal(matching[0].real, true);
    assert.notEqual(first.findIndex(pattern => pattern.real), last.findIndex(pattern => pattern.real));
  });
}

test("새 놀이는 난이도·진짜 위치·배치를 무작위로 정한다", () => {
  // Given
  const easy = createRandomCloneGame(() => 0);
  const sequence = createRandomCloneGame(() => .999);
  // When / Then
  assert.equal(easy.difficulty, "easy");
  assert.equal(sequence.difficulty, "sequence");
  assert.notEqual(easy.round.findIndex(pattern => pattern.real), sequence.round.findIndex(pattern => pattern.real));
  assert.notDeepEqual(easy.positions, sequence.positions);
});

test("단서는 한 번만 재생하고 소멸·생성 효과 후 관찰 동작을 반복한다", () => {
  // Given / When
  const states = [5199, 5200, 5799, 5800, 6399, 6400, 13600].map(clonePlayback);
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

test("관찰 동작은 깜빡임 횟수·앉기·일어서기 경계를 지키고 반복한다", () => {
  // Given
  const real = { real: true, action: "sit" as const, blinks: 2 };
  const fake = { ...real, real: false, blinks: 1 };
  // When
  const at = (time: number) => clonePose(real, time);
  // Then
  assert.equal(at(649).blinking, false);
  assert.equal(at(650).blinking, true);
  assert.equal(at(950).blinking, false);
  assert.equal(at(1250).blinking, true);
  assert.equal(clonePose(fake, 1250).blinking, false);
  assert.equal(at(1550).blinking, false);
  assert.equal(at(2199).frame, 0);
  assert.equal(at(2200).frame, 1);
  assert.equal(at(3400).frame, 4);
  assert.equal(at(5199).frame, 1);
  assert.equal(at(5200).frame, 0);
  assert.deepEqual(at(cloneCycleMs + 650), at(650));
});

test("움직임 줄이기는 중간 자세를 생략해도 깜빡임 횟수와 앉기 단서를 유지한다", () => {
  // Given
  const real = { real: true, action: "sit" as const, blinks: 2 };
  // When
  const blink = clonePose(real, 1250, true);
  const sit = clonePose(real, 2200, true);
  const stand = clonePose(real, 4000, true);
  // Then
  assert.equal(blink.blinking, true);
  assert.equal(sit.frame, 4);
  assert.equal(stand.frame, 0);
});

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
