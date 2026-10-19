"use client";

import { useEffect, useRef } from "react";
import type { Assignment } from "../lib/reading-types";
import { resolveChildSelection, type ChildDataStatus } from "../lib/child-task-policy";

export function useChildAssignmentSelection(options: {
  storageKey: string | null;
  dataStatus: ChildDataStatus;
  childId: string;
  date: string;
  assignments: Assignment[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const restoration = useRef({ key: "", restored: false });
  const { storageKey, dataStatus, childId, date, assignments, selectedId, onSelect } = options;
  useEffect(() => {
    if (!storageKey) {
      restoration.current = { key: "", restored: false };
      return;
    }
    if (dataStatus !== "ready") return;
    const newScope = restoration.current.key !== storageKey;
    if (newScope) restoration.current = { key: storageKey, restored: false };
    let storedId: string | null = null;
    try { storedId = window.sessionStorage.getItem(storageKey); } catch { /* Storage can be unavailable. */ }
    const resolved = resolveChildSelection({
      profileKind: "child", dataStatus, childId, date, assignments,
      currentId: newScope ? "" : selectedId, storedId, restored: restoration.current.restored,
    });
    restoration.current.restored = resolved.restored;
    if (resolved.selectedId !== selectedId) onSelect(resolved.selectedId);
    if (resolved.persistId) {
      try { window.sessionStorage.setItem(storageKey, resolved.persistId); } catch { /* Keep the in-memory selection. */ }
    }
  }, [storageKey, dataStatus, childId, date, assignments, selectedId, onSelect]);

  return (id: string) => {
    if (!storageKey || dataStatus !== "ready" || !assignments.some((assignment) => assignment.id === id && assignment.childId === childId && assignment.date === date)) return;
    restoration.current = { key: storageKey, restored: true };
    onSelect(id);
    try { window.sessionStorage.setItem(storageKey, id); } catch { /* Keep the user's selection in memory. */ }
  };
}
