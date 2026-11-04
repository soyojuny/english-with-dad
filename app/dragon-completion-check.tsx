"use client";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assignment, ReadingData, TaskType } from "../lib/reading-types";
import type { CompletionRequestState } from "../lib/task-completion";
import type { DragonController } from "./use-dragon-world";
import { missingDragonLearning } from "../lib/dragon-data";
import { fetchChildTodayData } from "../lib/supabase/reading-store";
import { DragonFeedback } from "./dragon-companion";

type Props = {
  controller: DragonController; data: ReadingData; assignments: Assignment[]; ready: boolean;
  completionStates: Record<string, CompletionRequestState>; quizPending: boolean;
  supabase: SupabaseClient; ownerUserId: string; childId: string; date: string;
  onSnapshot: (data: Omit<ReadingData, "children" | "manualLogs">) => void;
  onNavigate: (assignmentId: string, task: TaskType | "quiz") => void;
};
export function DragonCompletionCheck(props: Props) {
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const latest = useRef(props.data); latest.current = props.data;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const data = props.data;
  const assignments = props.assignments;
  const missing = missingDragonLearning(data, assignments);
  const uncertain = props.quizPending || Object.values(props.completionStates).some((state) => ["pending", "checking", "uncertain", "error"].includes(state.status));
  const world = props.controller.world;
  async function check() {
    setChecked(true); setError("");
    if (!props.ready || checking) return;
    setChecking(true);
    const source = props.data;
    try {
      const saved = await fetchChildTodayData(props.supabase, props.ownerUserId, props.childId, props.date);
      if (!alive.current || latest.current !== source) return;
      props.onSnapshot(saved);
      await props.controller.run({ action: "sync" });
    } catch {
      if (alive.current) setError("학습 기록을 확인하지 못했어요. 다시 확인해 주세요.");
    } finally { if (alive.current) setChecking(false); }
  }
  return <section className="dragon-completion-check" aria-label="오늘 완료 확인">
    <button type="button" className="primary-button" disabled={checking} onClick={() => void check()}>오늘 완료 확인</button>
    <DragonFeedback controller={props.controller} />
    {checked && <div aria-live="polite">
      {!props.ready ? <p>학습 기록을 불러온 뒤 다시 확인해 주세요. 아직 달성 여부를 알 수 없어요.</p>
        : checking ? <p>저장된 오늘 학습을 확인하고 있어요.</p>
        : error ? <p role="alert">{error}</p>
        : <>
          {uncertain && <p>학습 저장 결과를 확인 중이에요. 해당 학습의 저장 안내에서 결과 확인·재시도를 해 주세요. 학습을 다시 할 필요는 없어요.</p>}
          {world?.credited ? <p>오늘 달성을 인정했어요! 성장·보상 반영이 저장됐어요.{world.dragons.length === 0 ? " 첫 알을 골라 주세요." : ""}{missing.length > 0 ? " 이후 바뀐 학습은 아래에 남아 있지만, 인정된 달성과 보상은 유지돼요." : ""}</p>
            : !assignments.length ? <p>오늘은 배정된 학습이 없어요. 성장과 모아 둔 보상은 그대로예요.</p>
            : !missing.length && !uncertain ? <p>학습은 모두 저장됐어요. {props.controller.error ? "드래곤 반영 결과를 다시 확인해 주세요." : "달성·성장·보상 반영을 확인하고 있어요."}</p>
            : <p>아래 학습을 확인해 주세요.</p>}
          {missing.length > 0 && <ul>{missing.map((item) => <li key={`${item.assignmentId}:${item.task}`}><button type="button" onClick={() => props.onNavigate(item.assignmentId, item.task)}>{item.title} · {item.label}{item.task === "quiz" ? "" : ` ${item.remaining}회 남음`} →</button></li>)}</ul>}
        </>}
    </div>}
  </section>;
}
