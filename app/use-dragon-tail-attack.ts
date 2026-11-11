"use client";
import { useEffect, useState } from "react";
import { dragonTailAttackAnimation, type DragonTailAttackAnimation } from "../lib/dragon-art";

export function useDragonTailAttack(enabled: boolean, resetKey: string, animation: DragonTailAttackAnimation = dragonTailAttackAnimation) {
  const [frame, setFrame] = useState<number | null>(null);
  const [resting, setResting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const active = enabled && frame !== null;
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    const cancel = () => { if (document.hidden) { setFrame(null); setResting(false); } };
    document.addEventListener("visibilitychange", cancel);
    return () => { query.removeEventListener("change", update); document.removeEventListener("visibilitychange", cancel); };
  }, [enabled]);
  useEffect(() => { setFrame(null); setResting(false); }, [enabled, resetKey, animation]);
  useEffect(() => {
    if (!active) return;
    const finish = () => { setFrame(null); setResting(animation.holdLastFrame); };
    if (reducedMotion) {
      setFrame(animation.reducedFrame);
      const timer = window.setTimeout(finish, 300);
      return () => window.clearTimeout(timer);
    }
    let current = frame ?? 0;
    const timer = window.setInterval(() => {
      current += 1;
      if (current >= animation.frames) finish();
      else setFrame(current);
    }, 1000 / animation.fps);
    return () => window.clearInterval(timer);
  }, [active, reducedMotion, animation]);
  const start = () => {
    if (!enabled || document.hidden) return;
    setResting(false);
    setFrame((current) => current === null ? 0 : current);
  };
  return { active, resting: enabled && resting, frame: frame ?? (resting ? animation.frames - 1 : 0), start, clearRest: () => setResting(false) };
}
