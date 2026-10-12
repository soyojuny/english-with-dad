import type { AudioLaunch, Completion, TaskType } from "./reading-types";
import { getLaunchMinutes } from "./reading-calculations";
import { taskDefinitions } from "./reading-data";

export type CompletionPayload = {
  assignmentId: string;
  taskType: TaskType;
  completedAt: string;
  minutes: number;
  audioOpenedAt: string | null;
  count: number;
};
export type CompletionAttempt = Readonly<{ expectedCount: number; payload: Readonly<CompletionPayload> }>;
export type SavedCompletion = { key: string; value: Completion };
export type CompletionSaveResult =
  | { status: "saved"; completion: SavedCompletion }
  | { status: "conflict"; completion: SavedCompletion | null };
export type CompletionInput = {
  assignmentId: string;
  taskType: TaskType;
  targetCount: number;
  completedAt: string;
  completion?: Completion | null;
  launch?: AudioLaunch | null;
};
export type CompletionRequestState =
  | { status: "idle" }
  | { status: "pending" | "checking" | "error" | "uncertain"; attempt: CompletionAttempt; message: string }
  | { status: "success" | "conflict"; attempt: CompletionAttempt; completion: SavedCompletion | null; message: string };

export class CompletionSaveError extends Error {
  constructor(message: string, public readonly outcome: "rejected" | "uncertain") {
    super(message);
  }
}

type CoordinatorOptions = {
  ownerUserId: string;
  save: (owner: string, payload: CompletionPayload, expectedCount: number) => Promise<CompletionSaveResult>;
  fetch: (owner: string, assignmentId: string, taskType: TaskType) => Promise<SavedCompletion | null>;
  onChange: (key: string, state: CompletionRequestState) => void;
  onCompletion: (completion: SavedCompletion) => void;
};

export function buildCompletionAttempt(input: CompletionInput): CompletionAttempt | null {
  const expectedCount = input.completion?.count ?? 0;
  if (expectedCount >= input.targetCount) return null;
  const task = taskDefinitions[input.taskType];
  const addedMinutes = task.needsAudio ? getLaunchMinutes(input.launch, task.minutes) : task.minutes;
  return Object.freeze({
    expectedCount,
    payload: Object.freeze({
      assignmentId: input.assignmentId,
      taskType: input.taskType,
      completedAt: input.completedAt,
      minutes: (input.completion?.minutes ?? 0) + addedMinutes,
      audioOpenedAt: task.needsAudio ? input.launch?.openedAt ?? null : null,
      count: expectedCount + 1,
    }),
  });
}

function sameTimestamp(left: string | null, right: string | null) {
  if (left === right) return true;
  return left !== null && right !== null && Date.parse(left) === Date.parse(right);
}

function matchesAttempt(completion: SavedCompletion | null, attempt: CompletionAttempt) {
  const value = completion?.value;
  const payload = attempt.payload;
  return value !== undefined && value.count === payload.count && value.minutes === payload.minutes
    && sameTimestamp(value.completedAt, payload.completedAt)
    && sameTimestamp(value.audioOpenedAt, payload.audioOpenedAt);
}

// One instance belongs to one owner/profile screen; dispose it when that screen changes.
export function createCompletionCoordinator(options: CoordinatorOptions) {
  type Request = { attempt: CompletionAttempt; state: CompletionRequestState; version: number };
  const requests = new Map<string, Request>();
  const latest = new Map<string, SavedCompletion>();
  let disposed = false;

  function isCurrent(key: string, request: Request, version: number) {
    return !disposed && requests.get(key) === request && request.version === version;
  }

  function set(key: string, request: Request, state: CompletionRequestState) {
    request.state = state;
    options.onChange(key, state);
  }

  function finish(key: string, request: Request, version: number, completion: SavedCompletion | null, success: boolean) {
    if (!isCurrent(key, request, version)) return;
    const known = latest.get(key);
    if (completion && known && known.value.count > completion.value.count) {
      completion = known;
      success = false;
    }
    if (completion) {
      latest.set(key, completion);
      options.onCompletion(completion);
    }
    set(key, request, {
      status: success ? "success" : "conflict",
      attempt: request.attempt,
      completion,
      message: success ? "완료 기록을 저장했습니다." : "완료 기록이 변경되었습니다. 최신 기록을 확인하세요.",
    });
  }

  async function send(key: string, request: Request, version: number) {
    if (!isCurrent(key, request, version)) return;
    const attempt = request.attempt;
    set(key, request, { status: "pending", attempt, message: "완료 기록을 저장하고 있습니다." });
    try {
      const result = await options.save(options.ownerUserId, attempt.payload, attempt.expectedCount);
      finish(key, request, version, result.completion, result.status === "saved" || matchesAttempt(result.completion, attempt));
    } catch (error) {
      if (!isCurrent(key, request, version)) return;
      const rejected = error instanceof CompletionSaveError && error.outcome === "rejected";
      set(key, request, {
        status: rejected ? "error" : "uncertain",
        attempt,
        message: rejected ? error.message : "저장 결과를 확인하지 못했습니다. 결과를 확인한 뒤 같은 요청을 재시도하세요.",
      });
    }
  }

  async function check(key: string, retry: boolean) {
    const request = requests.get(key);
    if (disposed || !request || !["error", "uncertain"].includes(request.state.status)) return;
    const version = ++request.version;
    const attempt = request.attempt;
    set(key, request, { status: "checking", attempt, message: "완료 저장 결과를 확인하고 있습니다." });
    try {
      const completion = await options.fetch(options.ownerUserId, attempt.payload.assignmentId, attempt.payload.taskType);
      if (!isCurrent(key, request, version)) return;
      if (matchesAttempt(completion, attempt)) {
        finish(key, request, version, completion, true);
      } else if ((completion?.value.count ?? 0) !== attempt.expectedCount) {
        finish(key, request, version, completion, false);
      } else if (retry) {
        // A delayed original write can still arrive: guarded save uses the same expected count.
        await send(key, request, version);
      } else {
        set(key, request, { status: "uncertain", attempt, message: "완료 기록이 아직 확인되지 않았습니다. 같은 요청을 재시도할 수 있습니다." });
      }
    } catch {
      if (!isCurrent(key, request, version)) return;
      set(key, request, { status: "uncertain", attempt, message: "완료 기록을 조회하지 못했습니다. 결과 확인을 다시 시도하세요." });
    }
  }

  return {
    getState(key: string): CompletionRequestState { return requests.get(key)?.state ?? { status: "idle" }; },
    async start(input: CompletionInput) {
      if (disposed) return;
      const key = `${input.assignmentId}:${input.taskType}`;
      const previous = requests.get(key);
      if (previous && !["success", "conflict"].includes(previous.state.status)) return;
      const known = latest.get(key)?.value;
      const completion = known && known.count >= (input.completion?.count ?? 0) ? known : input.completion;
      const attempt = buildCompletionAttempt({ ...input, completion });
      if (!attempt) return;
      const request: Request = { attempt, state: { status: "idle" }, version: 0 };
      // Set the lock before callbacks or the first await, independently of React rendering.
      requests.set(key, request);
      await send(key, request, 0);
    },
    markUncertain(key: string) {
      const request = requests.get(key);
      if (!disposed && request?.state.status === "pending") {
        set(key, request, { status: "uncertain", attempt: request.attempt, message: "저장 응답을 기다리고 있습니다. 결과를 확인하세요." });
      }
    },
    checkResult(key: string) { return check(key, false); },
    retry(key: string) { return check(key, true); },
    dispose() { disposed = true; },
  };
}
