import { dragonFlightAnimations, dragonTailAttackAnimation, fireTailAttackAnimation, fireBreathAnimation, thunderBreathAnimation } from "./dragon-art";
import type { DragonSkill } from "./dragon-types";

export type CloneAction = "stand" | "blink" | "sit" | "walk" | "fly" | "tail-attack" | "breath";
export type CloneStep = { action: CloneAction; facing: "left" | "right" };
export type ClonePattern = { real: boolean; steps: CloneStep[] };
export type ClonePosition = { x: number; y: number };
export const cloneStepMs = 3000;

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
export const cloneCycleMs = 10200;
export const cloneClueMs = 9000;
export const cloneMagicMs = 600;
export const cloneSuccessMs = 1200;

export function clonePlayback(elapsed: number) {
  if (elapsed < cloneClueMs) return { phase: "clue" as const, elapsed };
  if (elapsed < cloneClueMs + cloneMagicMs) return { phase: "vanish" as const, elapsed: elapsed - cloneClueMs };
  if (elapsed < cloneClueMs + cloneMagicMs * 2) return { phase: "emerge" as const, elapsed: elapsed - cloneClueMs - cloneMagicMs };
  return { phase: "observe" as const, elapsed: (elapsed - cloneClueMs - cloneMagicMs * 2) % cloneCycleMs };
}

export function createRandomCloneGame(random = Math.random, skills: readonly DragonSkill[] = []) {
  return { round: createCloneRound(skills, random), positions: createClonePositions(random) };
}

export function createCloneRound(skills: readonly DragonSkill[], random = Math.random): ClonePattern[] {
  const actions: CloneAction[] = ["stand", "blink", "sit", "walk"];
  for (const skill of ["fly", "tail-attack", "breath"] as const) if (skills.includes(skill)) actions.push(skill);
  const available = [...actions];
  const steps: CloneStep[] = Array.from({ length: 3 }, () => ({
    action: available.splice(Math.floor(random() * available.length), 1)[0],
    facing: random() < .5 ? "left" : "right",
  }));
  const changed = Math.floor(random() * steps.length);
  const alternatives = actions.filter(action => action !== steps[changed].action);
  const round: ClonePattern[] = [
    { real: true, steps },
    { real: false, steps: steps.map((step, index) => index === changed ? { ...step, action: alternatives[Math.floor(random() * alternatives.length)] } : { ...step }) },
    { real: false, steps: steps.map((step, index) => index === changed ? { ...step, facing: step.facing === "left" ? "right" : "left" } : { ...step }) },
  ];
  for (let i = round.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [round[i], round[j]] = [round[j], round[i]];
  }
  return round;
}

export function clonePose(pattern: ClonePattern, elapsed: number, reducedMotion = false, element: "fire" | "thunder" = "fire") {
  const t = elapsed % cloneCycleMs;
  const step = pattern.steps[Math.min(2, Math.floor(t / cloneStepMs))];
  const local = t % cloneStepMs;
  const action = t >= cloneClueMs ? "stand" : step.action;
  let frame = 0;
  let motion = "";
  if (action === "sit") {
    frame = local < 1000 ? Math.min(4, Math.floor(local / 200)) : local < 1800 ? 4 : Math.max(0, 4 - Math.floor((local - 1800) / 200));
    if (reducedMotion) frame = local < 1800 ? 4 : 0;
  } else if (action === "walk") frame = reducedMotion ? 0 : Math.floor(local / 200) % 3;
  else if (action === "fly") {
    const animation = dragonFlightAnimations[element];
    const takeoffMs = animation.frames.takeoff * 1000 / animation.fps;
    motion = local < takeoffMs ? "takeoff" : local >= cloneStepMs - takeoffMs ? "takeoff" : "hover";
    if (reducedMotion) motion = "hover";
    frame = reducedMotion ? 0 : local < takeoffMs ? Math.floor(local * animation.fps / 1000)
      : local >= cloneStepMs - takeoffMs ? Math.min(animation.frames.takeoff - 1, Math.floor((cloneStepMs - local) * animation.fps / 1000))
      : Math.floor((local - takeoffMs) * animation.fps / 1000) % animation.frames.hover;
  } else if (action === "tail-attack") {
    const animation = element === "fire" ? fireTailAttackAnimation : dragonTailAttackAnimation;
    frame = reducedMotion ? animation.reducedFrame : Math.min(animation.frames - 1, Math.floor(local * animation.fps / 1000));
  } else if (action === "breath") {
    const animation = element === "fire" ? fireBreathAnimation : thunderBreathAnimation;
    let end = 0;
    frame = animation.durations.findIndex(duration => { end += duration; return local < end; });
    if (frame === -1) frame = animation.durations.length - 1;
    if (reducedMotion) frame = animation.reducedFrame;
  }
  return { action, frame, motion, facing: step.facing, blinking: action === "blink" && (local >= 500 && local < 800 || local >= 1200 && local < 1500) };
}
