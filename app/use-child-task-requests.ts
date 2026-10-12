"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { createClient } from "../lib/supabase/client";
import type { Assignment, ReadingData, TaskType } from "../lib/reading-types";
import { getAssignmentTaskCount } from "../lib/reading-calculations";
import { createAudioReturnCoordinator, type AudioReturnState, type SavedAudioLaunch } from "../lib/audio-return";
import { createCompletionCoordinator, type CompletionRequestState, type SavedCompletion } from "../lib/task-completion";
import { mergeAudioLaunchSnapshot, mergeCompletionSnapshot, type ChildDataStatus } from "../lib/child-task-policy";
import { fetchAudioLaunch, fetchCompletion, saveAudioReturn, saveCompletionGuarded } from "../lib/supabase/reading-store";

type Options = {
  scopeKey: string | null;
  dataStatus: ChildDataStatus;
  ownerUserId: string;
  supabase: ReturnType<typeof createClient>;
  assignments: Assignment[];
  data: ReadingData;
  setData: Dispatch<SetStateAction<ReadingData>>;
};
type Context = {
  scopeKey: string;
  ids: Set<string>;
  audio: ReturnType<typeof createAudioReturnCoordinator>;
  completion: ReturnType<typeof createCompletionCoordinator>;
  isActive: () => boolean;
};
type Feedback = {
  scopeKey: string | null;
  completions: Record<string, CompletionRequestState>;
  returns: Record<string, AudioReturnState>;
};

export function useChildTaskRequests(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const context = useRef<Context | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ scopeKey: null, completions: {}, returns: {} });
  const { scopeKey, dataStatus, ownerUserId, supabase } = options;
  const idsKey = JSON.stringify(options.assignments.map((assignment) => assignment.id).sort());
  const ready = dataStatus === "ready";

  useEffect(() => {
    if (!scopeKey || !ready) return;
    let active = true;
    const ids = new Set<string>(JSON.parse(idsKey));
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const isActive = () => active && latest.current.scopeKey === scopeKey && latest.current.dataStatus === "ready";
    setFeedback({ scopeKey, completions: {}, returns: {} });

    const publishLaunch = (key: string, value: SavedAudioLaunch["value"]) => {
      if (!isActive()) return;
      latest.current.setData((current) => {
        if (!isActive()) return current;
        const merged = mergeAudioLaunchSnapshot(current.audioLaunches[key], value);
        return { ...current, audioLaunches: { ...current.audioLaunches, [key]: merged } };
      });
    };
    const publishCompletion = (saved: SavedCompletion) => {
      if (!isActive()) return;
      latest.current.setData((current) => {
        if (!isActive()) return current;
        return { ...current, completions: {
          ...current.completions, [saved.key]: mergeCompletionSnapshot(current.completions[saved.key], saved.value),
        } };
      });
    };
    const completion = createCompletionCoordinator({
      ownerUserId,
      save: (owner, payload, expectedCount) => saveCompletionGuarded(supabase, owner, payload, expectedCount),
      fetch: (owner, assignmentId, taskType) => fetchCompletion(supabase, owner, assignmentId, taskType),
      onCompletion: publishCompletion,
      onChange: (key, state) => {
        if (!isActive()) return;
        setFeedback((current) => ({ ...current, scopeKey, completions: { ...current.completions, [key]: state } }));
        clearTimeout(timers.get(key));
        timers.delete(key);
        if (state.status === "pending" || state.status === "checking") {
          // Notify once; retain the attempt and require result checking before any retry.
          timers.set(key, setTimeout(() => {
            if (isActive()) completion.markUncertain(key);
          }, 15_000));
        }
      },
    });
    const audio = createAudioReturnCoordinator({
      ownerUserId, activeAssignmentIds: [...ids], launches: latest.current.data.audioLaunches,
      initialVisibility: document.visibilityState === "hidden" ? "hidden" : "visible",
      save: (owner, payload) => saveAudioReturn(supabase, owner, payload),
      fetch: (owner, assignmentId, taskType) => fetchAudioLaunch(supabase, owner, assignmentId, taskType),
      onLaunch: publishLaunch,
      onState: (key, state) => {
        if (isActive()) setFeedback((current) => ({ ...current, scopeKey, returns: { ...current.returns, [key]: state } }));
      },
    });
    const currentContext: Context = { scopeKey, ids, audio, completion, isActive };
    context.current = currentContext;
    const visibility = () => { if (isActive()) void audio.handleEvent({ type: document.visibilityState === "hidden" ? "hidden" : "visible" }); };
    const blur = () => { if (isActive()) void audio.handleEvent({ type: "blur" }); };
    const focus = () => { if (isActive()) void audio.handleEvent({ type: "focus", visible: document.visibilityState === "visible" }); };
    const pageshow = (event: PageTransitionEvent) => {
      if (isActive()) void audio.handleEvent({ type: "pageshow", persisted: event.persisted, visible: document.visibilityState === "visible" });
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    window.addEventListener("pageshow", pageshow);
    return () => {
      active = false;
      audio.dispose();
      completion.dispose();
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pageshow", pageshow);
      if (context.current === currentContext) context.current = null;
    };
  }, [scopeKey, ready, ownerUserId, supabase, idsKey]);

  useEffect(() => {
    const current = context.current;
    if (!current?.isActive()) return;
    for (const [key, launch] of Object.entries(options.data.audioLaunches)) {
      const [assignmentId, taskType] = key.split(":");
      current.audio.registerLaunch(assignmentId, taskType as TaskType, launch);
    }
  }, [options.data.audioLaunches, scopeKey, ready, idsKey]);

  function currentContext() {
    const current = context.current;
    return current?.isActive() ? current : null;
  }
  return {
    completionStates: feedback.scopeKey === scopeKey && ready ? feedback.completions : {},
    returnStates: feedback.scopeKey === scopeKey && ready ? feedback.returns : {},
    getLaunch(key: string) { return currentContext()?.audio.getLaunch(key); },
    complete(assignment: Assignment, taskType: TaskType) {
      const current = currentContext();
      if (!current?.ids.has(assignment.id)) return;
      const key = `${assignment.id}:${taskType}`;
      void current.completion.start({
        assignmentId: assignment.id, taskType, targetCount: getAssignmentTaskCount(assignment, taskType),
        completedAt: new Date().toISOString(), completion: latest.current.data.completions[key],
        launch: current.audio.getLaunch(key),
      });
    },
    retry(key: string) { const current = currentContext(); if (current) void current.completion.retry(key); },
    checkResult(key: string) { const current = currentContext(); if (current) void current.completion.checkResult(key); },
    retryReturn(key: string) { const current = currentContext(); if (current) void current.audio.retry(key); },
    prepareAudioLaunch() {
      const captured = currentContext();
      const isCurrent = () => captured !== null && currentContext() === captured;
      return {
        isCurrent,
        apply(saved: SavedAudioLaunch) {
          if (!captured || !isCurrent()) return false;
          const [assignmentId, taskType] = saved.key.split(":");
          if (!captured.ids.has(assignmentId)) return false;
          captured.audio.registerLaunch(assignmentId, taskType as TaskType, saved.value);
          latest.current.setData((current) => isCurrent() ? {
            ...current, audioLaunches: {
              ...current.audioLaunches, [saved.key]: mergeAudioLaunchSnapshot(current.audioLaunches[saved.key], saved.value),
            },
          } : current);
          return true;
        },
      };
    },
  };
}
