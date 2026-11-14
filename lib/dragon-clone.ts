export type CloneDifficulty = "easy" | "sequence";
export type ClonePattern = { real: boolean; action: "sit" | "walk" | "stand"; blinks: number };
export type ClonePosition = { x: number; y: number };

// A 24%-wide square occupies 42.7% of a 16:9 scene's height.
export function createClonePositions(random = Math.random): ClonePosition[] {
  const positions: ClonePosition[] = [];
  for (let attempt = 0; attempt < 160 && positions.length < 3; attempt++) {
    const candidate = { x: 14 + random() * 72, y: 24 + random() * 52 };
    if (positions.every(position => Math.abs(position.x - candidate.x) >= 28 || Math.abs(position.y - candidate.y) >= 46)) positions.push(candidate);
  }
  if (positions.length === 3) return positions;
  // Bounded fallback also leaves room between sprites when randomness repeats.
  return [
    { x: 14 + random() * 16, y: 24 + random() * 3 },
    { x: 70 + random() * 16, y: 24 + random() * 3 },
    { x: 35 + random() * 30, y: 73 + random() * 3 },
  ];
}
export const cloneCycleMs = 7200;
export const cloneClueMs = 5200;
export const cloneMagicMs = 600;
export const cloneSuccessMs = 1200;

export function clonePlayback(elapsed: number) {
  if (elapsed < cloneClueMs) return { phase: "clue" as const, elapsed };
  if (elapsed < cloneClueMs + cloneMagicMs) return { phase: "vanish" as const, elapsed: elapsed - cloneClueMs };
  if (elapsed < cloneClueMs + cloneMagicMs * 2) return { phase: "emerge" as const, elapsed: elapsed - cloneClueMs - cloneMagicMs };
  return { phase: "observe" as const, elapsed: (elapsed - cloneClueMs - cloneMagicMs * 2) % cloneCycleMs };
}

export function createRandomCloneGame(random = Math.random) {
  const difficulty: CloneDifficulty = random() < .5 ? "easy" : "sequence";
  return { difficulty, round: createCloneRound(difficulty, random), positions: createClonePositions(random) };
}
export const cloneClues: Record<CloneDifficulty, string> = {
  easy: "천천히 앉았다가 → 다시 일어나기",
  sequence: "눈을 두 번 깜빡이고 → 앉았다 일어나기",
};

export function createCloneRound(difficulty: CloneDifficulty, random = Math.random): ClonePattern[] {
  const sequence = difficulty === "sequence";
  const round: ClonePattern[] = [
    { real: true, action: "sit", blinks: sequence ? 2 : 0 },
    { real: false, action: sequence ? "sit" : "walk", blinks: sequence ? 1 : 0 },
    { real: false, action: sequence ? "walk" : "stand", blinks: sequence ? 2 : 0 },
  ];
  for (let i = round.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  return round;
}

export function clonePose(pattern: ClonePattern, elapsed: number, reducedMotion = false) {
  const t = elapsed % cloneCycleMs;
  let frame = 0;
  if (pattern.action === "sit" && t >= 2200 && t < 5200) {
    frame = t < 3400 ? Math.min(4, Math.floor((t - 2200) / 300) + 1)
      : t < 4000 ? 4 : Math.max(0, 4 - Math.floor((t - 4000) / 300));
    if (reducedMotion) frame = t < 4000 ? 4 : 0;
  }
  const walking = pattern.action === "walk" && t >= 2200 && t < 5200;
  const blinking = pattern.blinks > 0 && t >= 650 && t < 950 || pattern.blinks === 2 && t >= 1250 && t < 1550;
  return { frame, walking, walkFrame: reducedMotion ? 0 : Math.floor(Math.max(0, t - 2200) / 200) % 3, blinking };
}
