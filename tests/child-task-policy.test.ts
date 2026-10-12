import test from "node:test";
import assert from "node:assert/strict";
import {
  childSelectionStorageKey, resolveChildSelection, getTaskCompletionPolicy,
  mergeAudioLaunchSnapshot, mergeCompletionSnapshot,
} from "../lib/child-task-policy";
import type { TaskType } from "../lib/reading-types";

const assignments = ["first", "second"].map((id) => ({ id, childId: "child-1", date: "2026-10-12" }));
const selection = {
  profileKind: "child" as const, dataStatus: "ready" as const,
  childId: "child-1", date: "2026-10-12", assignments,
  currentId: "", storedId: "second", restored: false,
};
const launch = { openedAt: "2026-10-12T01:00:00.000Z", returnedAt: null };
const policy = {
  hasAssignment: true, taskType: "listen" as TaskType, launch,
  completedCount: 0, targetCount: 2, dataStatus: "ready" as const, requestStatus: "idle" as const,
};

test("selection reload restores the second assignment before any fallback is persisted", () => {
  assert.deepEqual(resolveChildSelection(selection), { selectedId: "second", persistId: "second", restored: true });
});

test("selection storage keys isolate owner, child and date including separators", () => {
  const base = childSelectionStorageKey("owner-1", "child-1", "2026-10-12");
  assert.notEqual(base, childSelectionStorageKey("owner-2", "child-1", "2026-10-12"));
  assert.notEqual(base, childSelectionStorageKey("owner-1", "child-2", "2026-10-12"));
  assert.notEqual(base, childSelectionStorageKey("owner-1", "child-1", "2026-10-13"));
  assert.notEqual(childSelectionStorageKey("a:b", "c", "d"), childSelectionStorageKey("a", "b:c", "d"));
});

for (const dataStatus of ["loading", "error"] as const) {
  test(`${dataStatus} preserves current selection and cannot overwrite stored selection`, () => {
    assert.deepEqual(resolveChildSelection({ ...selection, dataStatus, currentId: "second", assignments: [] }), {
      selectedId: "second", persistId: null, restored: false,
    });
  });
}

test("empty transient assignment snapshots do not erase storage or consume restoration", () => {
  assert.deepEqual(resolveChildSelection({ ...selection, assignments: [] }), { selectedId: "", persistId: null, restored: false });
});

for (const profileKind of ["parent", "library", null] as const) {
  test(`${profileKind} does not restore or persist a child assignment`, () => {
    assert.equal(resolveChildSelection({ ...selection, profileKind }).persistId, null);
    assert.equal(resolveChildSelection({ ...selection, profileKind }).selectedId, "");
  });
}

test("deleted, other-child and different-date selections fall back to the valid first assignment", () => {
  const extraneous = [
    { id: "foreign-child", childId: "child-2", date: selection.date },
    { id: "old-date", childId: "child-1", date: "2026-10-11" },
  ];
  for (const storedId of ["deleted", "foreign-child", "old-date"]) {
    assert.equal(resolveChildSelection({ ...selection, storedId, assignments: [...extraneous, ...assignments] }).selectedId, "first");
  }
});

test("valid user selection takes priority and a later snapshot cannot restore over it", () => {
  assert.equal(resolveChildSelection({ ...selection, currentId: "first" }).selectedId, "first");
  assert.equal(resolveChildSelection({ ...selection, currentId: "first", restored: true }).persistId, "first");
});

test("audio completion remains manual, requires a launch and does not require returnedAt", () => {
  assert.equal(getTaskCompletionPolicy(policy).showButton, true);
  assert.equal(getTaskCompletionPolicy(policy).disabled, false);
  assert.equal(getTaskCompletionPolicy({ ...policy, launch: null }).showButton, false);
  assert.equal(getTaskCompletionPolicy({ ...policy, hasAssignment: false }).showButton, false);
  assert.equal(getTaskCompletionPolicy({ ...policy, completedCount: 1 }).showButton, true);
  assert.equal(getTaskCompletionPolicy({ ...policy, completedCount: 2 }).showButton, false);
});

for (const requestStatus of ["pending", "checking", "error", "uncertain"] as const) {
  test(`${requestStatus} keeps feedback visible and disables a fresh increment`, () => {
    assert.deepEqual(getTaskCompletionPolicy({ ...policy, requestStatus }), {
      showButton: true, disabled: true, showFeedback: true,
    });
  });
}

test("load error is distinguishable from a clean missing launch", () => {
  const missing = { ...policy, launch: null };
  assert.equal(getTaskCompletionPolicy(missing).showFeedback, false);
  assert.equal(getTaskCompletionPolicy({ ...missing, dataStatus: "error" }).showFeedback, true);
  assert.equal(getTaskCompletionPolicy({ ...policy, dataStatus: "loading" }).disabled, true);
});

test("self/copywork show manual completion without audio and disable at target", () => {
  for (const taskType of ["self", "copywork"] as const) {
    assert.equal(getTaskCompletionPolicy({ ...policy, taskType, launch: null }).showButton, true);
    assert.equal(getTaskCompletionPolicy({ ...policy, taskType, launch: null, completedCount: 2 }).disabled, true);
  }
  for (const taskType of ["listen", "shadow", "wordRead"] as const) {
    assert.equal(getTaskCompletionPolicy({ ...policy, taskType, launch: null }).showButton, false);
  }
});

test("conflict feedback remains visible after a reconciled target completion", () => {
  assert.equal(getTaskCompletionPolicy({ ...policy, requestStatus: "conflict", completedCount: 2 }).showFeedback, true);
});

test("launch snapshots cannot erase local first return or overwrite a newer launch", () => {
  const local = { ...launch, returnedAt: "2026-10-12T01:03:00.000Z" };
  assert.deepEqual(mergeAudioLaunchSnapshot(local, { ...launch, openedAt: "2026-10-12T01:00:00+00:00" }), local);
  const newer = { openedAt: "2026-10-12T02:00:00.000Z", returnedAt: null };
  assert.deepEqual(mergeAudioLaunchSnapshot(newer, local), newer);
  assert.deepEqual(mergeAudioLaunchSnapshot(local, newer), newer);
});

test("completion snapshots never regress a later count", () => {
  const newer = { count: 2, minutes: 20, completedAt: "2026-10-12T02:00:00.000Z", audioOpenedAt: launch.openedAt };
  assert.deepEqual(mergeCompletionSnapshot(newer, { ...newer, count: 1, minutes: 10 }), newer);
});
