"use client";
import { useEffect, useState } from "react";
import { dragonTailAttackAnimation } from "../lib/dragon-art";

export function useDragonTailAttack(enabled: boolean, resetKey: string) {
  const [frame, setFrame] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const active = enabled && frame !== null;
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    const cancel = () => { if (document.hidden) setFrame(null); };
    document.addEventListener("visibilitychange", cancel);
    return () => { query.removeEventListener("change", update); document.removeEventListener("visibilitychange", cancel); };
  }, [enabled]);
  useEffect(() => { setFrame(null); }, [enabled, resetKey]);
  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      setFrame(24);
      const timer = window.setTimeout(() => setFrame(null), 300);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setInterval(() => setFrame((current) => current === null || current === dragonTailAttackAnimation.frames - 1 ? null : current + 1), 1000 / dragonTailAttackAnimation.fps);
    return () => window.clearInterval(timer);
  }, [active, reducedMotion]);
  const start = () => {
    if (!enabled || document.hidden) return;
    setFrame((current) => current === null ? 0 : current);
  };
  return { active, frame: frame ?? 0, start };
}
