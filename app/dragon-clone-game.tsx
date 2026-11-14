"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cloneClues, cloneCycleMs, cloneClueMs, cloneMagicMs, cloneSuccessMs, clonePlayback, clonePose, createRandomCloneGame, type ClonePattern, type ClonePosition } from "../lib/dragon-clone";

const artwork = "/assets/dragons/baby/";

function CloneSprite({ element, pattern, elapsed, reducedMotion }: { element: "fire" | "thunder"; pattern: ClonePattern; elapsed: number; reducedMotion: boolean }) {
  const pose = clonePose(pattern, elapsed, reducedMotion);
  return <span className={`clone-sprite${pose.walking ? " is-stepping" : ""}`} aria-hidden="true">
    <span className="clone-pose" style={{ backgroundImage: `url('${artwork}${element}-${pose.walking ? "walk-bde" : "sit-sequence"}.webp')`, backgroundPosition: `${pose.walking ? pose.walkFrame * 50 : pose.frame * 25}% 0%` }} />
    <img className="clone-blink" src={`${artwork}${element}-blink.webp`} alt="" draggable={false} style={{ opacity: pose.blinking ? 1 : 0 }} />
  </span>;
}

export function DragonCloneGame({ element, scene, origin, onClose, paused = false }: { element: "fire" | "thunder"; scene: HTMLElement; origin: ClonePosition; onClose: () => void; paused?: boolean }) {
  const [game, setGame] = useState(createRandomCloneGame);
  const { difficulty, round, positions } = game;
  const [wonAt, setWonAt] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [message, setMessage] = useState("");
  const playback = clonePlayback(elapsed);
  const phase = wonAt === null ? playback.phase : "won";
  const poseElapsed = wonAt === null ? playback.elapsed : clonePlayback(wonAt).elapsed;
  const progress = wonAt !== null ? Math.min(1, (elapsed - wonAt) / cloneSuccessMs) : Math.min(1, playback.elapsed / cloneMagicMs);
  const heading = useRef<HTMLHeadingElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => {
      setHidden(document.hidden);
      if (document.hidden && wonAt === null) { setElapsed(0); setMessage(""); }
    };
    updateMotion(); updateVisibility();
    query.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { query.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", updateVisibility); };
  }, [wonAt]);
  useEffect(() => {
    if (paused || hidden) return;
    const timer = window.setInterval(() => setElapsed(current => {
      const next = current + 100;
      const start = cloneClueMs + cloneMagicMs * 2;
      return wonAt === null && next >= start + cloneCycleMs ? start : next;
    }), 100);
    return () => window.clearInterval(timer);
  }, [paused, hidden, wonAt]);
  useEffect(() => {
    if (wonAt !== null && elapsed - wonAt >= cloneSuccessMs) onClose();
  }, [wonAt, elapsed, onClose]);
  useEffect(() => {
    if (phase === "observe") {
      choices.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    } else if (phase === "clue") heading.current?.focus({ preventScroll: true });
    if (phase === "clue" || phase === "observe") scene.scrollIntoView?.({ block: "center", behavior: "instant" });
  }, [phase, round, scene]);

  function newRound() {
    setGame(createRandomCloneGame()); setWonAt(null); setDismissed([]); setElapsed(0); setMessage("");
  }
  function showClue() { setElapsed(0); setMessage(""); }
  function choose(index: number) {
    if (phase !== "observe" || paused || dismissed.includes(index)) return;
    if (round[index].real) { setWonAt(elapsed); setMessage("역시 넌 나를 알아보는구나!"); }
    else { setDismissed(current => [...current, index]); setMessage("헤헤, 나는 분신이야! 약속한 행동을 다시 살펴봐."); }
  }
  return <section className="dragon-clone-game" aria-label="분신 관찰 놀이" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    {createPortal(<div className="clone-stage" data-phase={phase}>
      {phase === "clue" || phase === "vanish" ? <div className="clone-teacher" style={{ left: `${Math.max(14, Math.min(86, origin.x))}%`, top: `${Math.max(24, Math.min(76, origin.y))}%` }}>
        <span className="clone-magic-body" style={{ opacity: phase === "vanish" ? 1 - progress : 1, transform: `scale(${phase === "vanish" && !reducedMotion ? 1 - progress * .3 : 1})` }}>
          <CloneSprite element={element} pattern={round.find(pattern => pattern.real)!} elapsed={phase === "vanish" ? cloneClueMs : poseElapsed} reducedMotion={reducedMotion} />
        </span>
        {phase === "vanish" && <span className="clone-magic-burst" style={{ opacity: Math.sin(progress * Math.PI), transform: `scale(${reducedMotion ? 1 : .4 + progress * .6})` }} />}
      </div> : <div ref={choices} className="clone-choices">{round.map((pattern, index) => <button type="button" key={index}
        style={{ left: `${positions[index].x}%`, top: `${positions[index].y}%` }}
        className={`clone-candidate${dismissed.includes(index) ? " is-dismissed" : ""}${phase === "won" && pattern.real ? " is-real" : ""}`}
        aria-label={`${index + 1}번 드래곤 선택`} disabled={phase !== "observe" || paused || dismissed.includes(index)} onClick={() => choose(index)}>
        <span className="clone-magic-body" style={{ opacity: phase === "emerge" ? progress : phase === "won" && !pattern.real ? 1 - progress : 1, transform: `scale(${phase === "emerge" && !reducedMotion ? .7 + progress * .3 : 1})` }}>
          <CloneSprite element={element} pattern={pattern} elapsed={phase === "emerge" ? 0 : poseElapsed} reducedMotion={reducedMotion} />
        </span>
        {phase === "emerge" && <span className="clone-magic-burst" style={{ opacity: Math.sin(progress * Math.PI), transform: `scale(${reducedMotion ? 1 : .4 + progress * .6})` }} />}
        {phase === "won" && pattern.real && <span className="clone-success-sparkle" style={{ opacity: Math.sin(progress * Math.PI), transform: `scale(${reducedMotion ? 1 : .6 + progress * .4})` }} />}
      </button>)}</div>}
    </div>, scene)}
    <header className="clone-header"><h3 ref={heading} tabIndex={-1}>진짜 나를 찾아봐!</h3><button type="button" onClick={onClose}>놀이 끝내기</button></header>
    <div className="clone-hint"><span>우리만 아는 약속</span><strong>{cloneClues[difficulty]}</strong></div>
    <p className="clone-status" role="status">{paused ? "잠깐 쉬는 중이야. 동작 재생을 누르면 이어서 놀 수 있어." : phase === "clue" ? "내 행동을 잘 봐. 한 번 보여 주고 분신으로 변할게!" : phase === "vanish" || phase === "emerge" ? "빛 속에서 분신들이 나타나고 있어!" : message || "배경 속에서 약속한 행동을 하는 드래곤을 골라 줘."}</p>
    <div className="clone-controls">{phase === "observe" && <button type="button" onClick={showClue}>단서 다시 보기</button>}{phase !== "won" && <button type="button" onClick={newRound}>새로 놀기</button>}</div>
    <p className="clone-footnote">시간 제한은 없어. 행동은 천천히 반복돼. 분신을 골라도 계속 찾을 수 있어.</p>
  </section>;
}
