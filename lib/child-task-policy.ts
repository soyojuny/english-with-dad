import type { Assignment, AudioLaunch, Completion, TaskType } from "./reading-types";
import type { CompletionRequestState } from "./task-completion";
import { taskDefinitions } from "./reading-data";

export type ChildDataStatus = "loading" | "error" | "ready";
type SelectionInput = {
  profileKind: "child" | "parent" | "library" | null;
  dataStatus: ChildDataStatus;
  childId: string;
  date: string;
  assignments: readonly Pick<Assignment, "id" | "childId" | "date">[];
  currentId: string;
  storedId: string | null;
  restored: boolean;
};

export function childSelectionStorageKey(owner: string, child: string, date: string) {
  return `ewd-assignment:${encodeURIComponent(owner)}:${encodeURIComponent(child)}:${date}`;
}

export function resolveChildSelection(input: SelectionInput) {
  if (input.profileKind !== "child" || input.dataStatus !== "ready") {
    return { selectedId: input.currentId, persistId: null, restored: input.restored };
  }
  const ids = input.assignments.filter((assignment) => assignment.childId === input.childId && assignment.date === input.date)
    .map((assignment) => assignment.id);
  if (!ids.length) return { selectedId: "", persistId: null, restored: false };
  const selectedId = ids.includes(input.currentId) ? input.currentId
    : !input.restored && input.storedId && ids.includes(input.storedId) ? input.storedId : ids[0];
  return { selectedId, persistId: selectedId, restored: true };
}

export function getTaskCompletionPolicy(input: {
  hasAssignment: boolean;
  taskType: TaskType;
  launch?: AudioLaunch | null;
  completedCount: number;
  targetCount: number;
  dataStatus: ChildDataStatus;
  requestStatus: CompletionRequestState["status"];
}) {
  const done = input.completedCount >= input.targetCount;
  const showButton = input.hasAssignment && (!taskDefinitions[input.taskType].needsAudio || Boolean(input.launch) && !done);
  return {
    showButton,
    disabled: done || input.dataStatus !== "ready" || ["pending", "checking", "error", "uncertain"].includes(input.requestStatus),
    showFeedback: input.hasAssignment && (showButton || input.dataStatus !== "ready" || input.requestStatus !== "idle"),
  };
}

export function mergeAudioLaunchSnapshot(current: AudioLaunch | undefined, incoming: AudioLaunch): AudioLaunch {
  if (current) {
    const existingTime = Date.parse(current.openedAt);
    const incomingTime = Date.parse(incoming.openedAt);
    if (existingTime > incomingTime || existingTime === incomingTime && current.returnedAt !== null && incoming.returnedAt === null) return current;
  }
  return incoming;
}

export function mergeCompletionSnapshot(current: Completion | undefined, incoming: Completion): Completion {
  return current && current.count > incoming.count ? current : incoming;
}
