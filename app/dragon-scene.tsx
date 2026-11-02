"use client";
import { useRef } from "react";
import type { Dragon, DragonDecor, DragonItem, DragonSlot } from "../lib/dragon-types";
import { clampDragonPosition, dragonSlotLabels, dragonSprite, dragonStage } from "../lib/dragon-data";

const propSymbols: Record<string, string> = { flowers: "🌼", gem: "💎", lantern: "🏮", flag: "🚩", mushroom: "🍄" };
export function DragonSprite({ dragon }: { dragon: Pick<Dragon, "egg" | "days" | "element"> }) {
  return <span className="dragon-sprite" role="img" aria-label={dragonStage(dragon.days)} style={dragonSprite(dragon)} />;
}
export function DragonScene({ dragon, decor, catalog, selected, onSelect, onMove }: {
  dragon: Dragon; decor: DragonDecor; catalog: DragonItem[]; selected?: DragonSlot;
  onSelect?: (slot: DragonSlot) => void; onMove?: (slot: DragonSlot, x: number, y: number) => void;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{ slot: DragonSlot; pointer: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const item = (slot: DragonSlot) => catalog.find((entry) => entry.id === decor[slot].itemId);
  const background = item("background")?.art ?? "meadow";
  return <div ref={scene} className={`dragon-scene dragon-bg-${background}`} aria-label="드래곤의 공간">
    <div className="dragon-scenery" aria-hidden="true">✦</div>
    <div className={`dragon-resident ${dragon.days === 0 ? "is-egg" : ""}`}><DragonSprite dragon={dragon} /></div>
    {(["nest", "left", "right"] as const).map((slot) => {
      const entry = item(slot);
      if (!entry) return null;
      return <button key={slot} type="button" className={`dragon-prop dragon-prop-${slot} ${selected === slot ? "is-selected" : ""}`}
        aria-label={`${dragonSlotLabels[slot]}: ${entry.name}${onMove ? ", 방향키로 이동" : ""}`} disabled={!onMove}
        style={{ left: `${decor[slot].x}%`, top: `${decor[slot].y}%`, touchAction: onMove ? "none" : "auto" }}
        onClick={() => onSelect?.(slot)}
        onPointerDown={(event) => {
          if (!onMove) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { slot, pointer: event.pointerId, x: decor[slot].x, y: decor[slot].y, startX: event.clientX, startY: event.clientY };
          onSelect?.(slot);
        }}
        onPointerMove={(event) => {
          const start = drag.current; const bounds = scene.current?.getBoundingClientRect();
          if (!start || start.pointer !== event.pointerId || !bounds) return;
          const pos = clampDragonPosition(start.x + (event.clientX - start.startX) / bounds.width * 100, start.y + (event.clientY - start.startY) / bounds.height * 100);
          onMove?.(slot, pos.x, pos.y);
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={(event) => {
          const delta: Record<string, [number, number]> = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] };
          if (!delta[event.key]) return;
          event.preventDefault();
          const [dx, dy] = delta[event.key]; const pos = clampDragonPosition(decor[slot].x + dx, decor[slot].y + dy);
          onMove?.(slot, pos.x, pos.y);
        }}>
        {slot === "nest" ? <span className={`dragon-nest dragon-nest-${entry.art}`} /> : <span aria-hidden="true">{propSymbols[entry.art] ?? "✦"}</span>}
      </button>;
    })}
  </div>;
}
