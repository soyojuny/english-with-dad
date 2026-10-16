import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useChildTaskRequests } from "../../app/use-child-task-requests";
import type { Assignment, AudioLaunch, Completion, ReadingData, TaskType } from "../../lib/reading-types";

type HookOptions = Parameters<typeof useChildTaskRequests>[0];
type Deferred<T = void> = { promise: Promise<T>; resolve: (value: T) => void };
type Plan = {
  wait?: Promise<void>;
  error?: Error;
  responseError?: { message: string; code: string };
  data?: Record<string, unknown> | null;
};
type Row = Record<string, unknown>;

const openedAt = "2026-10-16T01:00:00.000Z";
const returnedAt = "2026-10-16T01:10:00.000Z";

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function assignment(id = "H02-배정-1", taskType: TaskType = "listen"): Assignment {
  return {
    id, childId: "아이-민서", date: "2026-10-16", bookId: "책-달빛",
    activityCategory: "focusListen", tasks: [taskType], taskCounts: { [taskType]: 2 },
    quizEnabled: false, quizScore: null,
  };
}

function readingData(overrides: Partial<ReadingData> = {}): ReadingData {
  return { children: [], books: [], assignments: [], completions: {}, audioLaunches: {}, manualLogs: [], ...overrides };
}

function completionRow(id: string, count = 1): Row {
  return {
    owner_user_id: "보호자-하나", assignment_id: id, task_type: "listen",
    completed_at: returnedAt, minutes: 10, audio_opened_at: null, count,
  };
}

function audioRow(id: string, value: AudioLaunch): Row {
  return {
    owner_user_id: "보호자-하나", assignment_id: id, task_type: "listen",
    opened_at: value.openedAt, returned_at: value.returnedAt,
  };
}

/** A small query double for the four real reading-store calls used by this hook. */
function readingStoreDouble(rows: Row[] = []) {
  const database = structuredClone(rows);
  const plans: Plan[] = [];
  const calls: Array<{ table: string; operation: string; filters: Array<[string, unknown]> }> = [];

  function from(table: string) {
    let operation = "select";
    let values: Row = {};
    const filters: Array<[string, unknown]> = [];
    const query = {
      insert(value: Row) { operation = "insert"; values = value; return query; },
      update(value: Row) { operation = "update"; values = value; return query; },
      select(_columns: string) { return query; },
      eq(column: string, value: unknown) { filters.push([column, value]); return query; },
      is(column: string, value: unknown) { filters.push([column, value]); return query; },
      async maybeSingle() {
        const plan = plans.shift();
        calls.push({ table, operation, filters: [...filters] });
        await plan?.wait;
        if (plan?.error) throw plan.error;
        if (plan?.responseError) return { data: null, error: plan.responseError };
        if (plan?.data !== undefined) return { data: plan.data, error: null };
        const matches = database.filter((row) => filters.every(([column, value]) => row[column] === value));
        if (operation === "insert") {
          const existing = database.find((row) => row.owner_user_id === values.owner_user_id
            && row.assignment_id === values.assignment_id && row.task_type === values.task_type);
          if (existing) return { data: null, error: { code: "23505", message: "duplicate" } };
          database.push({ ...values });
          return { data: database.at(-1), error: null };
        }
        if (operation === "update" && matches.length === 1) Object.assign(matches[0], values);
        return { data: matches.length === 1 ? matches[0] : null, error: null };
      },
    };
    return query;
  }

  return { client: { from } as unknown as HookOptions["supabase"], database, plans, calls };
}

function hookOptions(store: ReturnType<typeof readingStoreDouble>, overrides: Partial<HookOptions> = {}) {
  const currentData = overrides.data ?? readingData();
  let published = currentData;
  const setData: HookOptions["setData"] = (next) => {
    published = typeof next === "function" ? next(published) : next;
  };
  const options: HookOptions = {
    scopeKey: "H02-민서-2026-10-16", dataStatus: "ready", ownerUserId: "보호자-하나",
    supabase: store.client, assignments: [assignment()], data: currentData, setData, ...overrides,
  };
  return { options, published: () => published };
}

function renderRequests(initialOptions: HookOptions, strict = false) {
  return renderHook(({ currentOptions }) => useChildTaskRequests(currentOptions), {
    initialProps: { currentOptions: initialOptions }, wrapper: strict ? StrictMode : undefined,
  });
}

function completionStatus(view: ReturnType<typeof renderRequests>, id = "H02-배정-1") {
  return view.result.current.completionStates[`${id}:listen`]?.status;
}

function expectInstalledListenersRemoved(
  add: ReturnType<typeof vi.spyOn>, remove: ReturnType<typeof vi.spyOn>, eventTypes: string[],
) {
  for (const eventType of eventTypes) {
    const installed: unknown[] = [];
    for (const call of add.mock.calls) {
      const type = call[0] as string;
      const callback = call[1] as unknown;
      if (type === eventType) installed.push(callback);
    }
    expect(installed.length).toBeGreaterThan(0);
    for (const callback of installed) {
      expect(remove).toHaveBeenCalledWith(eventType, callback);
    }
  }
}

test("H02-N01: 완료 요청은 실제 저장소 저장 결과를 feedback과 data에 연결한다", async () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);

  // When
  await act(async () => { view.result.current.complete(assignment(), "listen"); });

  // Then
  expect(completionStatus(view)).toBe("success");
  expect(fixture.published().completions["H02-배정-1:listen"]?.count).toBe(1);
  expect(store.calls).toHaveLength(1);
  expect(store.calls[0].table).toBe("completions");
});

test("H02-N02: 불확실한 완료는 결과 확인 action으로 실제 fetch 결과를 반영한다", async () => {
  // Given
  vi.useFakeTimers();
  vi.setSystemTime(new Date(returnedAt));
  const store = readingStoreDouble();
  store.plans.push({ error: new Error("응답 유실") }, { data: completionRow("H02-배정-1") });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  await act(async () => { view.result.current.complete(assignment(), "listen"); });

  // When
  await act(async () => { view.result.current.checkResult("H02-배정-1:listen"); });

  // Then
  expect(completionStatus(view)).toBe("success");
  expect(fixture.published().completions["H02-배정-1:listen"]?.count).toBe(1);
  expect(store.calls.map((call) => call.operation)).toEqual(["insert", "select"]);
});

test("H02-N03: 명시적으로 거절된 완료는 재시도 action으로 다시 저장한다", async () => {
  // Given
  const store = readingStoreDouble();
  store.plans.push({ responseError: { code: "42501", message: "저장 거절" } }, { data: null });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  await act(async () => { view.result.current.complete(assignment(), "listen"); });
  await act(async () => { view.result.current.checkResult("H02-배정-1:listen"); });

  // When
  await act(async () => { view.result.current.retry("H02-배정-1:listen"); });

  // Then
  expect(store.calls.filter((call) => call.table === "completions").length).toBe(4);
  expect(completionStatus(view)).toBe("success");
});

test("H02-N04: blur 뒤 focus는 오디오 복귀 저장과 launch publication을 연결한다", async () => {
  // Given
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options);

  // When
  await act(async () => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });

  // Then
  expect(view.result.current.returnStates["H02-배정-1:listen"]?.status).toBe("saved");
  expect(fixture.published().audioLaunches["H02-배정-1:listen"]?.returnedAt).not.toBeNull();
});

test("H02-N05: 오류난 오디오 복귀는 retryReturn action으로 저장을 다시 시도한다", async () => {
  // Given
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  store.plans.push({ error: new Error("저장 실패") });
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options);
  await act(async () => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });

  // When
  await act(async () => { view.result.current.retryReturn("H02-배정-1:listen"); });

  // Then
  expect(view.result.current.returnStates["H02-배정-1:listen"]?.status).toBe("saved");
  expect(store.calls.filter((call) => call.table === "audio_launches")).toHaveLength(2);
});

test("H02-E01: pending은 14,999ms에 유지되고 15,000ms와 15,001ms에는 uncertain이며 timer가 남지 않는다", async () => {
  // Given
  vi.useFakeTimers();
  const store = readingStoreDouble();
  const gate = deferred();
  store.plans.push({ wait: gate.promise });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  act(() => { view.result.current.complete(assignment(), "listen"); });

  // When
  await act(async () => { await vi.advanceTimersByTimeAsync(14_999); });
  const before = completionStatus(view);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  const boundary = completionStatus(view);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });

  // Then
  expect(before).toBe("pending");
  expect(boundary).toBe("uncertain");
  expect(completionStatus(view)).toBe("uncertain");
  expect(vi.getTimerCount()).toBe(0);
});

test("H02-E02: visibilitychange hidden 뒤 visible은 복귀를 한 번 저장한다", async () => {
  // Given
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options);
  const visibility = vi.spyOn(document, "visibilityState", "get");

  // When
  visibility.mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  visibility.mockReturnValue("visible");
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });

  // Then
  expect(view.result.current.returnStates["H02-배정-1:listen"]?.status).toBe("saved");
  expect(store.calls.filter((call) => call.operation === "update")).toHaveLength(1);
});

test("H02-E03: persisted pageshow는 departed/unreturned launch의 복귀를 저장한다", async () => {
  // Given
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options);
  window.dispatchEvent(new Event("blur"));

  // When
  await act(async () => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });

  // Then
  expect(view.result.current.returnStates["H02-배정-1:listen"]?.status).toBe("saved");
  expect(store.calls.filter((call) => call.operation === "update")).toHaveLength(1);
});

test("H02-E04: non-persisted pageshow는 departed/unreturned launch를 저장하지 않는다", async () => {
  // Given
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options);
  window.dispatchEvent(new Event("blur"));

  // When
  await act(async () => { window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false })); });

  // Then
  expect(view.result.current.returnStates).toEqual({});
  expect(store.calls.filter((call) => call.operation === "update")).toHaveLength(0);
});

test("H02-E05: checking은 14,999ms에 유지되고 15,000ms와 15,001ms에는 uncertain이며 timer가 남지 않는다", async () => {
  // Given
  vi.useFakeTimers();
  const store = readingStoreDouble();
  const fetchGate = deferred();
  store.plans.push({ error: new Error("응답 유실") }, { wait: fetchGate.promise });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  await act(async () => { view.result.current.complete(assignment(), "listen"); });

  // When
  act(() => { view.result.current.checkResult("H02-배정-1:listen"); });
  await act(async () => { await vi.advanceTimersByTimeAsync(14_999); });
  const before = completionStatus(view);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  const boundary = completionStatus(view);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });

  // Then
  expect(before).toBe("checking");
  expect(boundary).toBe("uncertain");
  expect(completionStatus(view)).toBe("uncertain");
  expect(vi.getTimerCount()).toBe(0);
});

test("H02-E06: StrictMode 재마운트는 네 listener callback과 uncertain timer를 모두 정리한다", async () => {
  // Given
  vi.useFakeTimers();
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  const gate = deferred();
  const documentAdd = vi.spyOn(document, "addEventListener");
  const documentRemove = vi.spyOn(document, "removeEventListener");
  const windowAdd = vi.spyOn(window, "addEventListener");
  const windowRemove = vi.spyOn(window, "removeEventListener");
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options, true);

  // When
  await act(async () => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });
  store.plans.push({ wait: gate.promise });
  act(() => { view.result.current.complete(assignment(), "listen"); });
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  view.unmount();

  // Then
  expect(completionStatus(view)).toBe("uncertain");
  expect(store.calls.filter((call) => call.table === "audio_launches" && call.operation === "update")).toHaveLength(1);
  expectInstalledListenersRemoved(documentAdd, documentRemove, ["visibilitychange"]);
  expectInstalledListenersRemoved(windowAdd, windowRemove, ["blur", "focus", "pageshow"]);
  expect(vi.getTimerCount()).toBe(0);
});

test("H03-E01: dataStatus ready 해제는 이전 coordinator feedback을 숨기고 timer를 정리한다", async () => {
  // Given
  vi.useFakeTimers();
  const store = readingStoreDouble();
  const gate = deferred();
  store.plans.push({ wait: gate.promise });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  act(() => { view.result.current.complete(assignment(), "listen"); });

  // When
  view.rerender({ currentOptions: { ...fixture.options, dataStatus: "loading" } });

  // Then
  expect(view.result.current.completionStates).toEqual({});
  expect(vi.getTimerCount()).toBe(0);
});

test("H03-E02: owner-only rerender는 같은 scope와 assignment에서 새 owner로 완료를 저장한다", async () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);

  // When
  view.rerender({ currentOptions: { ...fixture.options, ownerUserId: "보호자-둘" } });
  await act(async () => { view.result.current.complete(assignment(), "listen"); });

  // Then
  expect(store.database).toContainEqual(expect.objectContaining({
    owner_user_id: "보호자-둘", assignment_id: "H02-배정-1",
  }));
});

test("H03-E03: assignment-ID-only rerender는 이전 ID를 무시하고 새 ID만 저장한다", async () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  const next = assignment("H03-새배정");

  // When
  view.rerender({ currentOptions: { ...fixture.options, assignments: [next] } });
  await act(async () => { view.result.current.complete(assignment(), "listen"); });
  await act(async () => { view.result.current.complete(next, "listen"); });

  // Then
  expect(store.database).toContainEqual(expect.objectContaining({
    owner_user_id: "보호자-하나", assignment_id: "H03-새배정",
  }));
  expect(store.database).not.toContainEqual(expect.objectContaining({ assignment_id: "H02-배정-1" }));
});

test("H03-E04: 이전 scope의 늦은 완료 저장은 새 scope data나 feedback을 바꾸지 않는다", async () => {
  // Given
  const store = readingStoreDouble();
  const gate = deferred();
  store.plans.push({ wait: gate.promise });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  act(() => { view.result.current.complete(assignment(), "listen"); });

  // When
  view.rerender({ currentOptions: { ...fixture.options, scopeKey: "H03-새scope", assignments: [assignment("H03-새배정")] } });
  await act(async () => { gate.resolve(); await Promise.resolve(); });

  // Then
  expect(view.result.current.completionStates).toEqual({});
  expect(fixture.published().completions).toEqual({});
});

test("H03-E05: 이전 scope의 늦은 결과 확인 fetch는 새 scope data나 feedback을 바꾸지 않는다", async () => {
  // Given
  vi.useFakeTimers();
  vi.setSystemTime(new Date(returnedAt));
  const store = readingStoreDouble();
  const fetchGate = deferred();
  store.plans.push({ error: new Error("응답 유실") }, { wait: fetchGate.promise, data: completionRow("H02-배정-1") });
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  await act(async () => { view.result.current.complete(assignment(), "listen"); });
  act(() => { view.result.current.checkResult("H02-배정-1:listen"); });

  // When
  view.rerender({ currentOptions: { ...fixture.options, scopeKey: "H03-fetch-새scope" } });
  await act(async () => { fetchGate.resolve(); await Promise.resolve(); });

  // Then
  expect(view.result.current.completionStates).toEqual({});
  expect(fixture.published().completions).toEqual({});
});

test("H03-E06: unmount 뒤 늦은 audio save는 publication을 만들지 않는다", async () => {
  // Given
  const launch = { openedAt, returnedAt: null };
  const store = readingStoreDouble([audioRow("H02-배정-1", launch)]);
  const gate = deferred();
  store.plans.push({ wait: gate.promise });
  const fixture = hookOptions(store, { data: readingData({ audioLaunches: { "H02-배정-1:listen": launch } }) });
  const view = renderRequests(fixture.options);
  window.dispatchEvent(new Event("blur"));
  window.dispatchEvent(new Event("focus"));
  const publishedBeforeUnmount = fixture.published().audioLaunches["H02-배정-1:listen"]?.returnedAt;

  // When
  view.unmount();
  await act(async () => { gate.resolve(); await Promise.resolve(); });

  // Then
  expect(fixture.published().audioLaunches["H02-배정-1:listen"]?.returnedAt).toBe(publishedBeforeUnmount);
});

test("H03-N01: 현재 scope의 prepareAudioLaunch apply는 활성 배정을 publish한다", () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  const prepared = view.result.current.prepareAudioLaunch();

  // When
  const applied = prepared.apply({ key: "H02-배정-1:listen", value: { openedAt, returnedAt: null } });

  // Then
  expect(applied).toBe(true);
  expect(fixture.published().audioLaunches["H02-배정-1:listen"]?.openedAt).toBe(openedAt);
});

test("H03-F01: unknown assignment의 prepareAudioLaunch apply는 거절하고 data를 바꾸지 않는다", () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  const prepared = view.result.current.prepareAudioLaunch();

  // When
  const applied = prepared.apply({ key: "없는-배정:listen", value: { openedAt, returnedAt: null } });

  // Then
  expect(applied).toBe(false);
  expect(fixture.published().audioLaunches).toEqual({});
});

test("H03-F02: scope 전환 뒤 이전 prepareAudioLaunch apply는 거절한다", () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  const prepared = view.result.current.prepareAudioLaunch();

  // When
  view.rerender({ currentOptions: { ...fixture.options, scopeKey: "H03-새scope" } });
  const applied = prepared.apply({ key: "H02-배정-1:listen", value: { openedAt, returnedAt: null } });

  // Then
  expect(applied).toBe(false);
  expect(fixture.published().audioLaunches).toEqual({});
});

test("H03-F03: unmount 뒤 이전 prepareAudioLaunch apply는 거절한다", () => {
  // Given
  const store = readingStoreDouble();
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  const prepared = view.result.current.prepareAudioLaunch();

  // When
  view.unmount();
  const applied = prepared.apply({ key: "H02-배정-1:listen", value: { openedAt, returnedAt: null } });

  // Then
  expect(applied).toBe(false);
  expect(fixture.published().audioLaunches).toEqual({});
});

test("H02-E07: unmount은 네 browser listener의 동일 callback과 pending timer를 모두 제거한다", () => {
  // Given
  vi.useFakeTimers();
  const store = readingStoreDouble();
  const gate = deferred();
  store.plans.push({ wait: gate.promise });
  const documentAdd = vi.spyOn(document, "addEventListener");
  const documentRemove = vi.spyOn(document, "removeEventListener");
  const windowAdd = vi.spyOn(window, "addEventListener");
  const windowRemove = vi.spyOn(window, "removeEventListener");
  const fixture = hookOptions(store);
  const view = renderRequests(fixture.options);
  act(() => { view.result.current.complete(assignment(), "listen"); });

  // When
  view.unmount();

  // Then
  expectInstalledListenersRemoved(documentAdd, documentRemove, ["visibilitychange"]);
  expectInstalledListenersRemoved(windowAdd, windowRemove, ["blur", "focus", "pageshow"]);
  expect(vi.getTimerCount()).toBe(0);
});
