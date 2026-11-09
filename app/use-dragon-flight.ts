"use client";
import { useEffect, useState } from "react";
import { dragonFlightAnimations } from "../lib/dragon-art";

export type FlightPhase = "ground" | "taking-off" | "flying" | "landing";
export function useDragonFlight(enabled: boolean, moving: boolean, resetKey: string, animation = dragonFlightAnimations.neutral) {
  const [{ phase, frame }, setFlight] = useState<{ phase: FlightPhase; frame: number }>({ phase: "ground", frame: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [enabled]);
  useEffect(() => { setFlight({ phase: "ground", frame: 0 }); }, [enabled, resetKey]);
  useEffect(() => {
    if (!enabled || phase === "ground") return;
    if (reducedMotion) {
      setFlight({ phase: phase === "landing" ? "ground" : "flying", frame: 0 });
      return;
    }
    const timer = window.setInterval(() => setFlight((current) => {
      if (current.phase === "ground") return current;
      if (current.phase === "taking-off" && current.frame === animation.frames.takeoff - 1) return { phase: "flying", frame: 0 };
      if (current.phase === "landing" && current.frame === 0) return { phase: "ground", frame: 0 };
      return { ...current, frame: current.phase === "landing" ? current.frame - 1 : (current.frame + 1) % (current.phase === "flying" ? moving ? animation.frames.move : animation.frames.hover : animation.frames.takeoff) };
    }), 1000 / animation.fps);
    return () => window.clearInterval(timer);
  }, [enabled, phase, moving, reducedMotion, animation]);
  const toggle = () => {
    if (!enabled) return;
    setFlight((current) => current.phase === "ground" ? { phase: "taking-off", frame: 0 } : current.phase === "flying" ? { phase: "landing", frame: animation.frames.takeoff - 1 } : current);
  };
  return { phase, frame, toggle, reducedMotion };
}
