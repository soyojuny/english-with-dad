"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DragonAction, DragonWorld } from "../lib/dragon-types";
import { updateDragonWorld } from "../lib/supabase/dragon-store";

type Snapshot = { scope: string; world: DragonWorld | null; pending: boolean; error: string; retry: DragonAction | null };
export function useDragonWorld(supabase: SupabaseClient, scope: string | null, childId: string, revision: string, ready: boolean) {
  const [state, setState] = useState<Snapshot>({ scope: "", world: null, pending: false, error: "", retry: null });
  const latestScope = useRef(scope);
  latestScope.current = ready ? scope : null;
  const context = useRef<{ scope: string; active: boolean; queue: Promise<unknown>; count: number } | null>(null);
  const run = useCallback((command: DragonAction): Promise<boolean> => {
    const current = context.current;
    if (!current || !current.active || latestScope.current !== current.scope) return Promise.resolve(false);
    const isCurrent = () => current.active && latestScope.current === current.scope;
    current.count++;
    setState((s) => ({ ...s, scope: current.scope, pending: true, error: "" }));
    const operation = current.queue.then(async () => {
      if (!isCurrent()) return false;
      try {
        const world = await updateDragonWorld(supabase, childId, command);
        if (isCurrent()) setState({ scope: current.scope, world, pending: current.count > 1, error: "", retry: null });
        return isCurrent();
      } catch (error) {
        if (isCurrent()) setState((s) => ({ ...s, error: `드래곤 반영 결과를 확인하지 못했어요. ${error instanceof Error ? error.message : "다시 확인해 주세요."}`, retry: command }));
        return false;
      } finally {
        current.count--;
        if (isCurrent()) setState((s) => ({ ...s, pending: current.count > 0 }));
      }
    });
    current.queue = operation;
    return operation;
  }, [supabase, childId]);
  useEffect(() => {
    if (!scope || !ready) return;
    const current = { scope, active: true, queue: Promise.resolve() as Promise<unknown>, count: 0 };
    context.current = current;
    setState({ scope, world: null, pending: false, error: "", retry: null });
    return () => { current.active = false; if (context.current === current) context.current = null; };
  }, [scope, ready, run]);
  useEffect(() => { if (scope && ready) void run({ action: "sync" }); }, [scope, ready, revision, run]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void run({ action: "sync" }); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [run]);
  const visible = ready && state.scope === scope;
  return { world: visible ? state.world : null, pending: visible ? state.pending : true, error: visible ? state.error : "", retry: visible ? state.retry : null, run };
}
export type DragonController = ReturnType<typeof useDragonWorld>;
