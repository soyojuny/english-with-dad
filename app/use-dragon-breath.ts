"use client";
import { useEffect, useState } from "react";
import { fireBreathAnimation, type DragonBreathAnimation } from "../lib/dragon-art";

export function useDragonBreath(enabled: boolean, resetKey: string, animation: DragonBreathAnimation = fireBreathAnimation) {
  const [frame, setFrame] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const active = enabled && frame !== null;
  useEffect(() => { setFrame(null); }, [enabled, resetKey]);
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    const cancel = () => { if (document.hidden) setFrame(null); };
    update(); query.addEventListener("change", update);
    document.addEventListener("visibilitychange", cancel);
    return () => { query.removeEventListener("change", update); document.removeEventListener("visibilitychange", cancel); };
  }, [enabled]);
  useEffect(() => {
    if (!active || frame === null) return;
    const timer = window.setTimeout(() => {
      setFrame(reducedMotion || frame === animation.durations.length - 1 ? null : frame + 1);
    }, reducedMotion ? 300 : animation.durations[frame]);
    return () => window.clearTimeout(timer);
  }, [active, frame, reducedMotion, animation]);
  return {
    active, frame: reducedMotion ? animation.reducedFrame : frame ?? 0,
    start: () => { if (enabled && !active && !document.hidden) setFrame(0); },
  };
}
