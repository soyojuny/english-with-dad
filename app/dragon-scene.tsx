"use client";
import { useEffect, useRef, useState } from "react";
import type { Dragon, DragonDecor, DragonItem, DragonSlot } from "../lib/dragon-types";
import { availableDragonItems, clampDragonPosition, dragonSlotLabels, dragonSprite, dragonStage, supportsDragonFlight, supportsDragonTailAttack, supportsDragonClone } from "../lib/dragon-data";
import { dragonArtwork, dragonBackgroundArt, dragonFlightAnimations, dragonPropArt, dragonTailAttackAnimation, fireTailAttackAnimation } from "../lib/dragon-art";
import { useDragonFlight } from "./use-dragon-flight";
import { useDragonTailAttack } from "./use-dragon-tail-attack";
import { DragonTailAttackSprite } from "./dragon-tail-attack";
import { DragonCloneGame } from "./dragon-clone-game";

export function DragonSprite({ dragon }: { dragon: Pick<Dragon, "egg" | "days" | "element"> }) {
  const artwork = dragonArtwork(dragon);
  const animatedBaby = dragon.days > 0 && dragon.days < 18;
  const motionPrefix = dragon.element ? `${dragon.element}-` : "";
  if (artwork) return <span className={`dragon-sprite dragon-artwork ${dragon.days >= 30 ? "is-adult-fire" : ""}`} role="img" aria-label={dragonStage(dragon.days)}>
    <img src={artwork} alt="" draggable={false} />
    {animatedBaby && <><img className="dragon-motion-layer dragon-breath" src={`/assets/dragons/baby/${motionPrefix}breathe.webp`} alt="" draggable={false} /><img className="dragon-motion-layer dragon-blink" src={`/assets/dragons/baby/${motionPrefix}blink.webp`} alt="" draggable={false} /></>}
  </span>;
  return <span className="dragon-sprite" role="img" aria-label={dragonStage(dragon.days)} style={dragonSprite(dragon)} />;
}
export function DragonScene({ dragon, decor, catalog, editing = false, selected, onSelect, onMove, paused = false }: {
  dragon: Dragon; decor: DragonDecor; catalog: DragonItem[]; selected?: DragonSlot; paused?: boolean;
  editing?: boolean;
  onSelect?: (slot: DragonSlot) => void; onMove?: (slot: DragonSlot, x: number, y: number) => void;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const cloneButton = useRef<HTMLButtonElement>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [position, setPosition] = useState({ x: 31, y: 65 });
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [pose, setPose] = useState<"standing" | "sitting" | "seated" | "rising">("standing");
  const [sitFrame, setSitFrame] = useState(0);
  const [facing, setFacing] = useState(1);
  const [attackQueued, setAttackQueued] = useState(false);
  const [attackFacing, setAttackFacing] = useState(1);
  const pointer = useRef<number | null>(null);
  const direction = useRef({ dx: 0, dy: 0 });
  const enabled = dragon.days > 0 && dragon.days < 18 && !editing && !cloneOpen;
  const canClone = !editing && supportsDragonClone(dragon) && !!dragon.skills?.includes("clone");
  const motionPrefix = dragon.element ? `${dragon.element}-` : "";
  const walkArtwork = `/assets/dragons/baby/${motionPrefix}walk-bde.webp`;
  const sitFrameCount = dragon.element === "ice" ? 4 : 5;
  const sitArtwork = `/assets/dragons/baby/${motionPrefix}sit-sequence.webp`;
  const moving = !!stick && Math.hypot(stick.dx, stick.dy) > 6;
  const canFly = enabled && supportsDragonFlight(dragon) && !!dragon.skills?.includes("fly");
  const flightAnimation = dragonFlightAnimations[dragon.element === "fire" || dragon.element === "thunder" ? dragon.element : "neutral"];
  const flight = useDragonFlight(canFly, moving, `${dragon.id}:${dragon.days}:${dragon.element}:${editing}`, flightAnimation);
  const airborne = canFly && flight.phase !== "ground";
  const canAttack = enabled && supportsDragonTailAttack(dragon) && !!dragon.skills?.includes("tail-attack");
  const attackAnimation = dragon.element === "fire" ? fireTailAttackAnimation : dragonTailAttackAnimation;
  const attack = useDragonTailAttack(canAttack && !airborne, `${dragon.id}:${dragon.days}:${dragon.element}:${editing}`, attackAnimation);
  const attacking = attack.active || attackQueued;
  const transitioning = airborne && flight.phase !== "flying";
  const canSit = enabled && !airborne && !attacking && !attack.resting;
  const flightMotion = flight.phase === "flying" ? moving ? "move" : "hover" : "takeoff";
  const flightCount = flightAnimation.frames[flightMotion];
  const flightFrame = flight.frame % flightCount;
  const flightColumns = flightAnimation.columns;
  const flightRows = Math.ceil(flightCount / flightColumns);
  const flightArtwork = (motion: string) => `/assets/dragons/baby/${flightAnimation.prefix}flight-${dragon.element && motion === "hover" ? "move" : motion}.webp`;
  const thunderFlight = canFly && dragon.element === "thunder";
  const liftProgress = Math.max(0, (flight.frame - 1) / (flightAnimation.frames.takeoff - 2));
  const transitionAltitude = thunderFlight ? flight.frame === 1 ? -1 : 28 * liftProgress * liftProgress * (3 - 2 * liftProgress) : flight.frame / (flightAnimation.frames.takeoff - 1) * 16;
  const altitude = flight.phase === "taking-off" || flight.phase === "landing" ? transitionAltitude : flight.phase === "flying" ? thunderFlight ? 28 : 16 : 0;
  useEffect(() => { setPosition({ x: 31, y: 65 }); setPose("standing"); setSitFrame(0); setStick(null); setAttackQueued(false); setAttackFacing(1); setFacing(1); setCloneOpen(false); pointer.current = null; }, [dragon.id, dragon.days, dragon.element, editing]);
  useEffect(() => { if (!canClone) setCloneOpen(false); }, [canClone]);
  useEffect(() => {
    if (!attackQueued || pose !== "standing") return;
    setAttackQueued(false);
    if (canAttack && !airborne && !document.hidden) { setAttackFacing(facing); attack.start(); }
  }, [attackQueued, pose, canAttack, airborne]);
  useEffect(() => { if (attack.resting) setFacing(-attackFacing); }, [attack.resting, attackFacing]);
  useEffect(() => {
    if (!attackQueued) return;
    const cancel = () => { if (document.hidden) setAttackQueued(false); };
    document.addEventListener("visibilitychange", cancel);
    return () => document.removeEventListener("visibilitychange", cancel);
  }, [attackQueued]);
  useEffect(() => {
    if (!canSit || stick || pose !== "standing") return;
    const timer = window.setTimeout(() => setPose("sitting"), 5000);
    return () => window.clearTimeout(timer);
  }, [canSit, stick, pose]);
  useEffect(() => {
    if (pose !== "sitting" && pose !== "rising") return;
    if (pose === "sitting" && sitFrame === sitFrameCount - 1) { setPose("seated"); return; }
    if (pose === "rising" && sitFrame === 0) { setPose("standing"); return; }
    const timer = window.setTimeout(() => setSitFrame((frame) => frame + (pose === "sitting" ? 1 : -1)), 300);
    return () => window.clearTimeout(timer);
  }, [pose, sitFrame, sitFrameCount]);
  useEffect(() => {
    if (!enabled || !moving || pose !== "standing" || transitioning || attacking) return;
    let frame = 0;
    let previous: number | null = null;
    const move = (time: number) => {
      if (previous !== null) {
        const { dx, dy } = direction.current;
        const length = Math.hypot(dx, dy);
        const speed = Math.min(length / 45, 1);
        const distance = Math.min(time - previous, 50) / 1000 * 20 * speed;
        if (length > 6) setPosition((p) => ({ x: Math.max(airborne ? 25 : 19, Math.min(airborne ? 74 : 81, p.x + dx / length * distance)), y: airborne ? p.y : Math.max(38, Math.min(80, p.y + dy / length * distance)) }));
      }
      previous = time;
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, moving, pose, transitioning, airborne, attacking]);
  const drag = useRef<{ slot: DragonSlot; pointer: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const items = availableDragonItems(catalog);
  const item = (slot: DragonSlot) => items.find((entry) => entry.id === decor[slot].itemId);
  const background = item("background")?.art ?? "lava-open-foreground";
  const backgroundArt = dragonBackgroundArt[background];
  const walking = enabled && moving && pose === "standing" && !airborne && !attacking;
  return <><div ref={scene} className={`dragon-scene dragon-bg-${background} ${enabled ? "is-controllable" : ""}`} aria-label="드래곤의 공간"
    onPointerDown={(event) => {
      if (!enabled || transitioning || attacking || pointer.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      attack.clearRest();
      pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId);
      direction.current = { dx: 0, dy: 0 };
      setStick({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, dx: 0, dy: 0 });
      if (pose === "seated" || pose === "sitting") setPose("rising");
    }}
    onPointerMove={(event) => {
      if (event.pointerId !== pointer.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (stick && Math.abs(event.clientX - bounds.left - stick.x) > 6) setFacing(event.clientX - bounds.left < stick.x ? -1 : 1);
      if (stick) {
        direction.current = { dx: event.clientX - bounds.left - stick.x, dy: event.clientY - bounds.top - stick.y };
        setStick({ ...stick, ...direction.current });
      }
    }}
    onPointerUp={(event) => { if (event.pointerId === pointer.current) { pointer.current = null; setStick(null); } }}
    onPointerCancel={(event) => { if (event.pointerId === pointer.current) { pointer.current = null; setStick(null); } }}
    onLostPointerCapture={(event) => { if (event.pointerId === pointer.current) { pointer.current = null; setStick(null); } }}>
    {enabled && <link rel="preload" as="image" href={walkArtwork} />}
    {canSit && <link rel="preload" as="image" href={sitArtwork} />}
    {canAttack && <link rel="preload" as="image" href={attackAnimation.artwork} />}
    {canFly && (dragon.element ? ["takeoff", "move"] : ["takeoff", "move", "hover"]).map((motion) => <link key={motion} rel="preload" as="image" href={flightArtwork(motion)} />)}
    <img className="dragon-background-art" src={backgroundArt} alt="" draggable={false} />
    {thunderFlight && airborne && <span className="dragon-flight-shadow" aria-hidden="true" style={{ left: `${position.x}%`, top: `${Math.min(94, position.y + 19.5)}%`, transform: `translate(-50%, -50%) scale(${1 - Math.max(0, altitude) / 28 * .55})`, opacity: 1 - Math.max(0, altitude) / 28 * .65 }} />}
    {!cloneOpen && <div className={`dragon-resident ${dragon.days === 0 ? "is-egg" : dragon.days < 18 ? "is-baby" : dragon.days >= 30 && dragon.element === "fire" ? "is-adult-fire" : ""} ${enabled ? "is-controlled" : ""} ${walking ? "is-walking" : ""} ${thunderFlight && airborne ? "has-thunder-flight" : ""}`} style={enabled ? { left: `${position.x}%`, top: `${Math.max(34, position.y - altitude)}%`, transform: `translate(-50%, -50%) scaleX(${facing})` } : undefined}>
      {dragon.days === 0 && <span className="dragon-ground-shadow" aria-hidden="true" />}
      {attack.active || attack.resting ? <DragonTailAttackSprite animation={attackAnimation} frame={attack.frame} resting={attack.resting} mirrored={attackFacing !== facing} /> : airborne ? <span className={`dragon-flight${dragon.element ? ` is-${dragon.element}` : ""}`} role="img" aria-label={flight.phase === "taking-off" ? "날아오르는 아기 드래곤" : flight.phase === "landing" ? "착륙하는 아기 드래곤" : moving ? "비행하는 아기 드래곤" : "공중에 머무는 아기 드래곤"}><span className="dragon-flight-frame" style={{ backgroundImage: `url('${flightArtwork(flightMotion)}')`, backgroundSize: `${flightColumns * 100}% ${flightRows * 100}%`, backgroundPosition: `${flightFrame % flightColumns * 100 / (flightColumns - 1)}% ${flightRows === 1 ? 0 : Math.floor(flightFrame / flightColumns) * 100 / (flightRows - 1)}%` }} /></span> : enabled && pose !== "standing" ? <span className={`dragon-sit is-${pose}`} style={{ backgroundImage: `url('${sitArtwork}')`, backgroundSize: `${sitFrameCount * 100}% 100%`, backgroundPositionX: `${sitFrame * 100 / (sitFrameCount - 1)}%` }} role="img" aria-label="쉬는 아기 드래곤" /> : <div className="dragon-idle"><DragonSprite dragon={dragon} /></div>}
      {walking && <span className="dragon-walk" role="img" aria-label="걷는 아기 드래곤"><span className="dragon-walk-frame" style={{ backgroundImage: `url('${walkArtwork}')` }} /></span>}
    </div>}
    {stick && <span className="dragon-stick" aria-hidden="true" style={{ left: stick.x, top: stick.y }}><span style={{ transform: `translate(${Math.max(-35, Math.min(35, stick.dx))}px, ${Math.max(-35, Math.min(35, stick.dy))}px)` }} /></span>}
    {(["left", "right"] as const).map((slot) => {
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
        <img className="dragon-prop-art" src={dragonPropArt[entry.art]} alt="" draggable={false} />
      </button>;
    })}
  </div>{cloneOpen && canClone && scene.current && <DragonCloneGame element={dragon.element === "thunder" ? "thunder" : "fire"} scene={scene.current} origin={position} paused={paused} onClose={() => {
    setCloneOpen(false);
    window.requestAnimationFrame(() => cloneButton.current?.focus({ preventScroll: true }));
  }} />}{canClone && !cloneOpen && <div className="dragon-flight-controls"><button ref={cloneButton} type="button" disabled={attacking || airborne || paused} onClick={() => {
    if (attacking || airborne || paused) return;
    setStick(null); pointer.current = null; direction.current = { dx: 0, dy: 0 };
    setPose("standing"); setSitFrame(0); attack.clearRest(); setCloneOpen(true);
  }}>분신 놀이</button><span>{airborne ? "착륙한 뒤 분신 놀이를 할 수 있어요." : "행동을 관찰해 세 마리 중 진짜를 찾아봐요."}</span></div>}{canAttack && <div className="dragon-flight-controls"><button type="button" disabled={attacking || airborne} onClick={() => {
    if (attacking || airborne) return;
    setStick(null); pointer.current = null; direction.current = { dx: 0, dy: 0 };
    if (pose !== "standing") { setPose("rising"); setAttackQueued(true); }
    else { setAttackFacing(facing); attack.start(); }
  }}>{attacking ? "꼬리 공격 중" : "꼬리 공격"}</button><span aria-live="polite">{attackQueued ? "일어서서 꼬리 공격을 준비해요." : attack.active ? "꼬리를 크게 휘둘러요!" : airborne ? "착륙한 뒤 꼬리 공격을 할 수 있어요." : dragon.element === "fire" ? "꼬리를 휘두른 뒤 반대쪽을 바라보며 서 있어요." : "꼬리 공격을 누르면 한 바퀴 돌며 꼬리를 휘둘러요."}</span></div>}{canFly && <div className="dragon-flight-controls"><button type="button" aria-pressed={airborne} disabled={transitioning || attacking} onClick={() => { if (attacking) return; attack.clearRest(); if (flight.phase === "ground") setPosition((p) => ({ ...p, x: Math.max(25, Math.min(74, p.x)) })); setPose("standing"); setSitFrame(0); setStick(null); pointer.current = null; direction.current = { dx: 0, dy: 0 }; flight.toggle(); }}>{flight.phase === "taking-off" ? "날아오르는 중" : flight.phase === "landing" ? "착륙하는 중" : "날기"}</button><span aria-live="polite">{flight.phase === "flying" ? "좌우로 드래그하면 날아요. 날기를 다시 누르면 착륙해요." : flight.phase === "ground" ? "날기를 누르면 하늘로 올라가요." : flight.phase === "taking-off" ? "날아오르고 있어요." : "땅으로 내려오고 있어요."}</span></div>}</>;
}
