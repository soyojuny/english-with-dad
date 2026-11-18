"use client";
import { useEffect, useState } from "react";
import { feedingDurations, feedingFrames, type FoodDefinition } from "../lib/dragon-food";

type Feeding = { food: FoodDefinition | null; step: number; progress: number; playing: boolean };
const empty: Feeding = { food: null, step: 0, progress: 0, playing: false };
export function useDragonFeeding(enabled: boolean, resetKey: string, element: "fire" | "thunder") {
  const [state, setState] = useState<Feeding>(empty);
  const [reducedMotion, setReducedMotion] = useState(false);
  const active = enabled && state.playing;
  useEffect(() => { setState(empty); }, [enabled, resetKey]);
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    const cancel = () => { if (document.hidden) setState(empty); };
    update(); query.addEventListener("change", update); document.addEventListener("visibilitychange", cancel);
    return () => { query.removeEventListener("change", update); document.removeEventListener("visibilitychange", cancel); };
  }, [enabled]);
  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      const timer = window.setTimeout(() => setState(current => ({ ...current, step: 13, progress: 1, playing: false })), 300);
      return () => window.clearTimeout(timer);
    }
    const durations = feedingDurations(element), start = Date.now();
    const timer = window.setInterval(() => {
      let elapsed = Date.now() - start, step = 0;
      while (step < durations.length && elapsed >= durations[step]) { elapsed -= durations[step]; step++; }
      setState(current => ({ ...current, step: Math.min(step, 13), progress: step >= durations.length ? 1 : elapsed / durations[step], playing: step < durations.length }));
    }, 16);
    return () => window.clearInterval(timer);
  }, [active, element, reducedMotion]);
  return {
    active, food: enabled ? state.food : null,
    step: active && reducedMotion ? 11 : state.step,
    progress: reducedMotion ? 1 : state.progress,
    frame: feedingFrames[active && reducedMotion ? 11 : state.step],
    start: (food: FoodDefinition) => { if (enabled && !active && !document.hidden) setState({ food, step: 0, progress: 0, playing: true }); },
    clear: () => setState(empty),
  };
}
