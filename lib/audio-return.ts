import type { AudioLaunch, TaskType } from "./reading-types";
import { taskDefinitions } from "./reading-data";

export type SavedAudioLaunch = { key: string; value: AudioLaunch };
export type AudioReturnPayload = { assignmentId: string; taskType: TaskType; openedAt: string; returnedAt: string };
export type AudioReturnState = {
  status: "waiting" | "saving" | "saved" | "error" | "conflict";
  openedAt: string;
  returnedAt: string | null;
  message: string;
};
export type AudioReturnEvent =
  | { type: "hidden" | "blur" | "visible" }
  | { type: "focus"; visible: boolean }
  | { type: "pageshow"; visible: boolean; persisted: boolean };
type Options = {
  ownerUserId: string;
  activeAssignmentIds: readonly string[];
  launches?: Record<string, AudioLaunch>;
  initialVisibility?: "visible" | "hidden";
  save: (owner: string, payload: AudioReturnPayload) => Promise<SavedAudioLaunch | null>;
  fetch: (owner: string, assignmentId: string, taskType: TaskType) => Promise<SavedAudioLaunch | null>;
  onLaunch: (key: string, value: AudioLaunch) => void;
  onState: (key: string, state: AudioReturnState) => void;
};

// Supply only the active child's assignments/launches and dispose on profile changes.
export function createAudioReturnCoordinator(options: Options) {
  type Launch = {
    assignmentId: string;
    taskType: TaskType;
    value: Readonly<AudioLaunch>;
    departed: boolean;
    state: AudioReturnState;
    inFlight: Promise<void> | null;
  };
  const activeAssignments = new Set(options.activeAssignmentIds);
  const launches = new Map<string, Launch>();
  let hidden = options.initialVisibility === "hidden";
  let disposed = false;

  function isCurrent(key: string, launch: Launch) {
    return !disposed && launches.get(key) === launch;
  }

  function makeLaunch(assignmentId: string, taskType: TaskType, value: AudioLaunch, departed: boolean): Launch {
    return {
      assignmentId, taskType, value: Object.freeze({ ...value }), departed, inFlight: null,
      state: { ...value, status: value.returnedAt === null ? "waiting" : "saved", message: "" },
    };
  }

  function setState(key: string, launch: Launch, status: AudioReturnState["status"], message: string) {
    if (!isCurrent(key, launch)) return;
    launch.state = { ...launch.value, status, message };
    options.onState(key, launch.state);
  }

  function register(assignmentId: string, taskType: TaskType, value: AudioLaunch, notify: boolean) {
    if (disposed || !activeAssignments.has(assignmentId) || !taskDefinitions[taskType]?.needsAudio) return;
    const time = Date.parse(value.openedAt);
    if (!Number.isFinite(time)) return;
    const key = `${assignmentId}:${taskType}`;
    const current = launches.get(key);
    if (current) {
      const existingTime = Date.parse(current.value.openedAt);
      if (time < existingTime) return;
      // Preserve an in-flight/local first return across equivalent DB timestamps or stale reloads.
      if (time === existingTime && (current.value.returnedAt !== null || value.returnedAt === null)) return;
    }
    const launch = makeLaunch(assignmentId, taskType, value, hidden);
    launches.set(key, launch);
    if (notify) options.onState(key, launch.state);
  }

  function reconcile(key: string, launch: Launch, saved: SavedAudioLaunch | null) {
    if (!isCurrent(key, launch)) return;
    if (!saved || saved.key !== key || Date.parse(saved.value.openedAt) < Date.parse(launch.value.openedAt)) {
      setState(key, launch, "conflict", "오디오 실행 기록이 변경되었습니다. 복귀 시간은 현재 화면에 유지합니다.");
      return;
    }
    if (Date.parse(saved.value.openedAt) > Date.parse(launch.value.openedAt)) {
      // A newer server launch has no departure evidence from this screen's old launch.
      const newer = makeLaunch(launch.assignmentId, launch.taskType, saved.value, false);
      launches.set(key, newer);
      options.onLaunch(key, newer.value);
      setState(key, newer, newer.state.status, "최신 오디오 실행 기록을 불러왔습니다.");
      return;
    }
    if (saved.value.returnedAt === null) {
      setState(key, launch, "error", "복귀 기록을 확인하지 못했습니다. 같은 복귀 시간을 다시 저장하세요.");
      return;
    }
    if (launch.value.returnedAt === null || Date.parse(saved.value.returnedAt) !== Date.parse(launch.value.returnedAt)) {
      launch.value = Object.freeze({ openedAt: launch.value.openedAt, returnedAt: saved.value.returnedAt });
      options.onLaunch(key, launch.value);
    }
    setState(key, launch, "saved", "오디오 복귀 시간을 저장했습니다.");
  }

  function persist(key: string, launch: Launch, publishLocal = false): Promise<void> {
    if (!isCurrent(key, launch) || launch.value.returnedAt === null) return Promise.resolve();
    if (launch.inFlight) return launch.inFlight;
    const payload: AudioReturnPayload = {
      assignmentId: launch.assignmentId, taskType: launch.taskType,
      openedAt: launch.value.openedAt, returnedAt: launch.value.returnedAt,
    };
    setState(key, launch, "saving", "오디오 복귀 시간을 저장하고 있습니다.");
    // Local elapsed time must reach manual completion even if the DB request never resolves.
    if (publishLocal && isCurrent(key, launch)) options.onLaunch(key, launch.value);
    launch.inFlight = (async () => {
      if (!isCurrent(key, launch)) return;
      try {
        let saved = await options.save(options.ownerUserId, payload);
        if (!isCurrent(key, launch)) return;
        if (saved === null) {
          saved = await options.fetch(options.ownerUserId, launch.assignmentId, launch.taskType);
        }
        reconcile(key, launch, saved);
      } catch (error) {
        setState(key, launch, "error", error instanceof Error ? error.message : "오디오 복귀 시간을 저장하지 못했습니다.");
      } finally {
        launch.inFlight = null;
      }
    })();
    return launch.inFlight;
  }

  for (const [key, value] of Object.entries(options.launches ?? {})) {
    const [assignmentId, taskType, extra] = key.split(":");
    if (extra === undefined) register(assignmentId, taskType as TaskType, value, false);
  }

  return {
    getLaunch(key: string): Readonly<AudioLaunch> | undefined { return launches.get(key)?.value; },
    getState(key: string): AudioReturnState | undefined { return launches.get(key)?.state; },
    registerLaunch(assignmentId: string, taskType: TaskType, value: AudioLaunch) {
      register(assignmentId, taskType, value, true);
    },
    async handleEvent(event: AudioReturnEvent, returnedAt = new Date().toISOString()) {
      if (disposed) return;
      if (event.type === "hidden" || event.type === "blur") {
        if (event.type === "hidden") hidden = true;
        for (const launch of launches.values()) {
          if (launch.value.returnedAt === null) launch.departed = true;
        }
        return;
      }
      if (event.type === "focus" && !event.visible) return;
      if (event.type === "pageshow" && (!event.visible || !event.persisted)) return;
      hidden = false;
      const saves: Promise<void>[] = [];
      for (const [key, launch] of launches) {
        if (launch.inFlight) {
          saves.push(launch.inFlight);
        } else if (launch.departed && launch.value.returnedAt === null
          && Date.parse(returnedAt) >= Date.parse(launch.value.openedAt)) {
          launch.value = Object.freeze({ ...launch.value, returnedAt });
          saves.push(persist(key, launch, true));
        }
      }
      await Promise.all(saves);
    },
    retry(key: string): Promise<void> {
      const launch = launches.get(key);
      if (!launch || disposed) return Promise.resolve();
      if (launch.inFlight) return launch.inFlight;
      return launch.state.status === "error" ? persist(key, launch) : Promise.resolve();
    },
    dispose() { disposed = true; },
  };
}
