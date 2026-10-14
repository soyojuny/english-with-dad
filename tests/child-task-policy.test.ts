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

test("정상 입력: 오디오 launch만으로 완료하지 않으며 수동 완료 버튼은 복귀 여부와 무관하게 남는다", () => {
  // Given
  const openedOnly = policy;
  const returned = { ...policy, launch: { ...launch, returnedAt: "2026-10-12T01:03:00.000Z" } };

  // When
  const openedOnlyPolicy = getTaskCompletionPolicy(openedOnly);
  const returnedPolicy = getTaskCompletionPolicy(returned);

  // Then
  assert.deepEqual(openedOnlyPolicy, { showButton: true, disabled: false, showFeedback: true });
  assert.deepEqual(returnedPolicy, { showButton: true, disabled: false, showFeedback: true });
});

test("경계값: 목표 2회 중 1회 완료는 오디오 수동 완료 버튼을 계속 표시한다", () => {
  // Given
  const partiallyCompleted = { ...policy, completedCount: 1, targetCount: 2 };

  // When
  const partialPolicy = getTaskCompletionPolicy(partiallyCompleted);

  // Then
  assert.deepEqual(partialPolicy, { showButton: true, disabled: false, showFeedback: true });
});

test("경계값: 목표 횟수에 도달하면 오디오 수동 완료 버튼을 숨긴다", () => {
  // Given
  const completed = { ...policy, completedCount: 2 };

  // When
  const completedPolicy = getTaskCompletionPolicy(completed);

  // Then
  assert.deepEqual(completedPolicy, { showButton: false, disabled: true, showFeedback: false });
});

test("경계값: launch 기록이 없으면 오디오 완료 버튼을 숨긴다", () => {
  // Given
  const missingLaunch = { ...policy, launch: null };

  // When
  const missingLaunchPolicy = getTaskCompletionPolicy(missingLaunch);

  // Then
  assert.equal(missingLaunchPolicy.showButton, false);
  assert.equal(missingLaunchPolicy.showFeedback, false);
});

test("경계값: 배정이 없으면 완료를 제안하지 않는다", () => {
  // Given
  const missingAssignment = { ...policy, hasAssignment: false };

  // When
  const missingAssignmentPolicy = getTaskCompletionPolicy(missingAssignment);

  // Then
  assert.equal(missingAssignmentPolicy.showButton, false);
  assert.equal(missingAssignmentPolicy.showFeedback, false);
});

for (const requestStatus of ["pending", "checking", "error", "uncertain"] as const) {
  test(`${requestStatus} keeps feedback visible and disables a fresh increment`, () => {
    assert.deepEqual(getTaskCompletionPolicy({ ...policy, requestStatus }), {
      showButton: true, disabled: true, showFeedback: true,
    });
  });
}

test("경계값: clean missing launch는 오류 피드백을 보이지 않는다", () => {
  // Given
  const missing = { ...policy, launch: null };

  // When
  const cleanMissingPolicy = getTaskCompletionPolicy(missing);

  // Then
  assert.equal(cleanMissingPolicy.showFeedback, false);
});

test("잘못된 입력 상태: error는 완료 증가를 막고 피드백을 보인다", () => {
  // Given
  const missing = { ...policy, launch: null };

  // When
  const errorPolicy = getTaskCompletionPolicy({ ...missing, dataStatus: "error" });

  // Then
  assert.deepEqual(errorPolicy, { showButton: false, disabled: true, showFeedback: true });
});

test("잘못된 입력 상태: loading은 완료 증가를 막고 피드백을 보인다", () => {
  // Given
  const loading = { ...policy, dataStatus: "loading" as const };

  // When
  const loadingPolicy = getTaskCompletionPolicy(loading);

  // Then
  assert.deepEqual(loadingPolicy, { showButton: true, disabled: true, showFeedback: true });
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

test("경계값: audio snapshot의 중복 openedAt은 현재 returnedAt을 지킨다", () => {
  // Given
  const local = { ...launch, returnedAt: "2026-10-12T01:03:00.000Z" };
  const duplicateWithoutReturn = { ...launch, openedAt: "2026-10-12T01:00:00+00:00" };

  // When
  const duplicateMerged = mergeAudioLaunchSnapshot(local, duplicateWithoutReturn);

  // Then
  assert.deepEqual(duplicateMerged, local);
});

test("경계값: 더 오래된 audio snapshot을 새 launch에 병합해도 새 launch를 지킨다", () => {
  // Given
  const newer = { openedAt: "2026-10-12T02:00:00.000Z", returnedAt: null };
  const older = { ...launch, returnedAt: "2026-10-12T01:03:00.000Z" };

  // When
  const merged = mergeAudioLaunchSnapshot(newer, older);

  // Then
  assert.deepEqual(merged, newer);
});

test("정상 입력: 더 새 audio snapshot을 이전 launch에 병합하면 새 launch를 반환한다", () => {
  // Given
  const older = { ...launch, returnedAt: "2026-10-12T01:03:00.000Z" };
  const newer = { openedAt: "2026-10-12T02:00:00.000Z", returnedAt: null };

  // When
  const merged = mergeAudioLaunchSnapshot(older, newer);

  // Then
  assert.deepEqual(merged, newer);
});

test("경계값: completion snapshot의 오래된 횟수는 더 큰 현재 횟수를 퇴행시키지 않는다", () => {
  // Given
  const newer = { count: 2, minutes: 20, completedAt: "2026-10-12T02:00:00.000Z", audioOpenedAt: launch.openedAt };
  const older = { ...newer, count: 1, minutes: 10 };

  // When
  const merged = mergeCompletionSnapshot(newer, older);

  // Then
  assert.deepEqual(merged, newer);
});

test("경계값: completion snapshot의 중복 횟수는 incoming 값을 반환한다", () => {
  // Given
  const current = { count: 2, minutes: 20, completedAt: "2026-10-12T02:00:00.000Z", audioOpenedAt: launch.openedAt };
  const duplicate = { ...current };

  // When
  const merged = mergeCompletionSnapshot(current, duplicate);

  // Then
  assert.deepEqual(merged, duplicate);
});
