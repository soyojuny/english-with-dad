"use client";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function ChildActivityHeader({ name, goal, done, total, count, dragon, onDragon, onLog, logTrigger }: {
  name: string; goal: string; done: number; total: number; count: number; dragon: boolean;
  onDragon: (open: boolean) => void; onLog: () => void; logTrigger: RefObject<HTMLButtonElement | null>;
}) {
  const dragonTrigger = useRef<HTMLButtonElement>(null);
  const previous = useRef(dragon);
  useEffect(() => {
    if (previous.current && !dragon) dragonTrigger.current?.focus();
    previous.current = dragon;
  }, [dragon]);
  return <div className="section-heading">
    <div><p className="eyebrow">{dragon ? "함께 읽고 함께 자라요" : "오늘의 학습"}</p>
      <h2 id="childTitle">{dragon ? "나의 드래곤" : "해야 할 활동을 바로 확인"}</h2></div>
    <div className="summary-strip">
      <span className="summary-pill"><strong>{name}</strong> · {goal}</span>
      {!dragon && <><span className="summary-pill"><strong>{done}</strong>/{total} 완료</span><span className="summary-pill"><strong>{count}</strong>건 예정</span></>}
      <button ref={logTrigger} className="secondary-button child-quick-log-button" type="button" onClick={onLog}>읽기·DVD 기록</button>
      <button ref={dragonTrigger} className="secondary-button" type="button" aria-pressed={dragon} onClick={() => onDragon(!dragon)}>{dragon ? "오늘의 학습으로" : "드래곤"}</button>
    </div>
  </div>;
}
