import test from "node:test";
import assert from "node:assert/strict";
import {
  createAudioReturnCoordinator, type AudioReturnPayload, type AudioReturnState, type SavedAudioLaunch,
} from "../lib/audio-return";
import { buildCompletionAttempt } from "../lib/task-completion";
import type { AudioLaunch, TaskType } from "../lib/reading-types";
import { deferred } from "./helpers/completion-supabase-fake";

const key = "assignment-1:listen";
const openedAt = "2026-10-12T01:00:00.000Z";
const firstReturn = "2026-10-12T01:02:01.000Z";
const laterReturn = "2026-10-12T01:10:00.000Z";
const newerOpenedAt = "2026-10-12T02:00:00.000Z";
const newerReturn = "2026-10-12T02:03:00.000Z";
const launch: AudioLaunch = { openedAt, returnedAt: null };
const focus = { type: "focus", visible: true } as const;
const visible = { type: "visible" } as const;

async function waitFor(predicate: () => boolean, message: string) {
  for (let turn = 0; turn < 50 && !predicate(); turn += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.ok(predicate(), message);
}

// Model conditional DB mutation and responses captured before a delayed delivery.
function audioServer() {
  const rows = new Map<string, AudioLaunch>();
  const saves: { owner: string; payload: AudioReturnPayload }[] = [];
  const reads: { owner: string; assignmentId: string; taskType: TaskType }[] = [];
  const savePlans: { before?: Promise<void>; after?: Promise<void>; fail?: boolean; loseResponse?: boolean }[] = [];
  const readPlans: { after?: Promise<void>; fail?: boolean }[] = [];
  return {
    rows, saves, reads, savePlans, readPlans,
    async save(owner: string, payload: AudioReturnPayload): Promise<SavedAudioLaunch | null> {
      saves.push({ owner, payload: { ...payload } });
      const plan = savePlans.shift();
      await plan?.before;
      if (plan?.fail) throw new Error("return write denied");
      const key = `${payload.assignmentId}:${payload.taskType}`;
      const row = rows.get(`${owner}:${key}`);
      let result: SavedAudioLaunch | null = null;
      if (row && Date.parse(row.openedAt) === Date.parse(payload.openedAt) && row.returnedAt === null) {
        row.returnedAt = payload.returnedAt;
        result = { key, value: { ...row } };
      }
      await plan?.after;
      if (plan?.loseResponse) throw new Error("response lost after commit");
      return result;
    },
    async fetch(owner: string, assignmentId: string, taskType: TaskType): Promise<SavedAudioLaunch | null> {
      reads.push({ owner, assignmentId, taskType });
      const plan = readPlans.shift();
      const key = `${assignmentId}:${taskType}`;
      const row = rows.get(`${owner}:${key}`);
      const result = row ? { key, value: { ...row } } : null;
      await plan?.after;
      if (plan?.fail) throw new Error("audio read denied");
      return result;
    },
  };
}

function harness(options: {
  launches?: Record<string, AudioLaunch>;
  owner?: string;
  initialVisibility?: "visible" | "hidden";
  server?: ReturnType<typeof audioServer>;
} = {}) {
  const server = options.server ?? audioServer();
  const owner = options.owner ?? "owner-1";
  const launches = options.launches ?? { [key]: launch };
  for (const [key, value] of Object.entries(launches)) server.rows.set(`${owner}:${key}`, { ...value });
  const published: SavedAudioLaunch[] = [];
  const states: { key: string; state: AudioReturnState }[] = [];
  const coordinator = createAudioReturnCoordinator({
    ownerUserId: owner,
    activeAssignmentIds: ["assignment-1", "assignment-2"],
    launches,
    initialVisibility: options.initialVisibility,
    save: server.save,
    fetch: server.fetch,
    onLaunch: (key, value) => published.push({ key, value }),
    onState: (key, state) => states.push({ key, state }),
  });
  return { coordinator, server, published, states };
}

test("initial focus, visible and pageshow are not departure evidence", async () => {
  const h = harness();
  await h.coordinator.handleEvent(focus, firstReturn);
  await h.coordinator.handleEvent(visible, firstReturn);
  await h.coordinator.handleEvent({ type: "pageshow", visible: true, persisted: true }, firstReturn);
  assert.equal(h.server.saves.length, 0);
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, null);
  assert.equal(h.published.length, 0);
});

test("hidden then focus while still hidden waits for visible", async () => {
  const h = harness();
  await h.coordinator.handleEvent({ type: "hidden" });
  await h.coordinator.handleEvent({ type: "focus", visible: false }, firstReturn);
  assert.equal(h.server.saves.length, 0);
  await h.coordinator.handleEvent(visible, firstReturn);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
});

test("blur alone is valid departure evidence for a visible focus return", async () => {
  const h = harness();
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, firstReturn);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.coordinator.getState(key)?.status, "saved");
});

test("duplicate focus/visible shares a pending save and keeps the first return time", async () => {
  const h = harness();
  const gate = deferred();
  h.server.savePlans.push({ before: gate.promise });
  await h.coordinator.handleEvent({ type: "hidden" });
  const first = h.coordinator.handleEvent(visible, firstReturn);
  const second = h.coordinator.handleEvent(focus, laterReturn);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.coordinator.getState(key)?.status, "saving");
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
  assert.equal(h.published[0].value.returnedAt, firstReturn);
  gate.resolve();
  await Promise.all([first, second]);
  await h.coordinator.handleEvent(focus, laterReturn);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.server.rows.get(`owner-1:${key}`)?.returnedAt, firstReturn);
});

test("local return publishes before DB save and is usable by manual completion while pending", async () => {
  const h = harness();
  const gate = deferred();
  h.server.savePlans.push({ before: gate.promise });
  await h.coordinator.handleEvent({ type: "blur" });
  const returning = h.coordinator.handleEvent(focus, firstReturn);
  assert.equal(h.server.rows.get(`owner-1:${key}`)?.returnedAt, null);
  assert.equal(h.published[0].value.returnedAt, firstReturn);
  const completion = buildCompletionAttempt({
    assignmentId: "assignment-1", taskType: "listen", targetCount: 2,
    completedAt: firstReturn, launch: h.coordinator.getLaunch(key),
  });
  assert.equal(completion?.payload.minutes, 3);
  assert.equal(completion?.payload.count, 1);
  gate.resolve();
  await returning;
});

test("failure leaves local elapsed time available and retries the same first timestamp", async () => {
  const h = harness();
  h.server.savePlans.push({ fail: true });
  await h.coordinator.handleEvent({ type: "hidden" });
  await h.coordinator.handleEvent(visible, firstReturn);
  assert.equal(h.coordinator.getState(key)?.status, "error");
  assert.match(h.coordinator.getState(key)?.message ?? "", /return write denied/);
  assert.equal(buildCompletionAttempt({
    assignmentId: "assignment-1", taskType: "listen", targetCount: 1,
    completedAt: firstReturn, launch: h.coordinator.getLaunch(key),
  })?.payload.minutes, 3);
  await h.coordinator.handleEvent(focus, laterReturn);
  assert.equal(h.server.saves.length, 1);
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key)?.status, "saved");
  assert.deepEqual(h.server.saves[1], h.server.saves[0]);
  assert.equal(h.server.rows.get(`owner-1:${key}`)?.returnedAt, firstReturn);
});

test("retry calls during a pending retry are deduplicated", async () => {
  const h = harness();
  h.server.savePlans.push({ fail: true });
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, firstReturn);
  const gate = deferred();
  h.server.savePlans.push({ before: gate.promise });
  const first = h.coordinator.retry(key);
  const second = h.coordinator.retry(key);
  assert.equal(h.server.saves.length, 2);
  gate.resolve();
  await Promise.all([first, second]);
});

test("synchronous launch registration catches departure before a React rerender", async () => {
  const h = harness({ launches: {} });
  h.coordinator.registerLaunch("assignment-1", "listen", launch);
  h.server.rows.set(`owner-1:${key}`, { ...launch });
  const departed = h.coordinator.handleEvent({ type: "blur" });
  const returned = h.coordinator.handleEvent(focus, firstReturn);
  await Promise.all([departed, returned]);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
});

test("new launch makes a delayed old save response obsolete in DB and callbacks", async () => {
  const h = harness();
  const gate = deferred();
  h.server.savePlans.push({ before: gate.promise });
  await h.coordinator.handleEvent({ type: "hidden" });
  const oldReturn = h.coordinator.handleEvent(visible, firstReturn);
  const newLaunch = { openedAt: newerOpenedAt, returnedAt: null };
  h.coordinator.registerLaunch("assignment-1", "listen", newLaunch);
  h.server.rows.set(`owner-1:${key}`, { ...newLaunch });
  const publishedCount = h.published.length;
  const stateCount = h.states.length;
  gate.resolve();
  await oldReturn;
  assert.deepEqual(h.coordinator.getLaunch(key), newLaunch);
  assert.deepEqual(h.server.rows.get(`owner-1:${key}`), newLaunch);
  assert.equal(h.published.length, publishedCount);
  assert.equal(h.states.length, stateCount);
});

test("old delivered success cannot overwrite a newly registered launch", async () => {
  const h = harness();
  const gate = deferred();
  h.server.savePlans.push({ after: gate.promise });
  await h.coordinator.handleEvent({ type: "blur" });
  const oldReturn = h.coordinator.handleEvent(focus, firstReturn);
  await waitFor(() => h.server.rows.get(`owner-1:${key}`)?.returnedAt !== null, "old save should commit");
  const newer = { openedAt: newerOpenedAt, returnedAt: null };
  h.coordinator.registerLaunch("assignment-1", "listen", newer);
  h.server.rows.set(`owner-1:${key}`, { ...newer });
  const count = h.published.length;
  gate.resolve();
  await oldReturn;
  assert.equal(h.published.length, count);
  assert.deepEqual(h.coordinator.getLaunch(key), newer);
});

test("null save conflict fetches and adopts a newer persisted launch without inventing its return", async () => {
  const h = harness();
  const newer = { openedAt: newerOpenedAt, returnedAt: null };
  h.server.rows.set(`owner-1:${key}`, { ...newer });
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, firstReturn);
  assert.deepEqual(h.server.reads, [{ owner: "owner-1", assignmentId: "assignment-1", taskType: "listen" }]);
  assert.deepEqual(h.coordinator.getLaunch(key), newer);
  await h.coordinator.handleEvent(focus, newerReturn);
  assert.equal(h.server.saves.length, 1);
});

test("same-launch conflict respects the persisted first return with equivalent openedAt", async () => {
  const h = harness();
  h.server.rows.set(`owner-1:${key}`, { openedAt: "2026-10-12T01:00:00+00:00", returnedAt: firstReturn });
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, laterReturn);
  assert.equal(h.coordinator.getState(key)?.status, "saved");
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.server.reads.length, 1);
});

test("persisted response loss retries safely and reconciles the original return", async () => {
  const h = harness();
  h.server.savePlans.push({ loseResponse: true });
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, firstReturn);
  assert.equal(h.coordinator.getState(key)?.status, "error");
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key)?.status, "saved");
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
  assert.deepEqual(h.server.saves[1], h.server.saves[0]);
});

test("reconciliation read failure retains local return and permits retry", async () => {
  const h = harness();
  h.server.rows.set(`owner-1:${key}`, { ...launch, returnedAt: firstReturn });
  h.server.readPlans.push({ fail: true });
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, firstReturn);
  assert.equal(h.coordinator.getState(key)?.status, "error");
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key)?.status, "saved");
});

test("missing or older persisted conflict never erases the local first return", async () => {
  for (const persisted of [null, { openedAt: "2026-10-12T00:00:00.000Z", returnedAt: null }]) {
    const h = harness();
    if (persisted) h.server.rows.set(`owner-1:${key}`, persisted);
    else h.server.rows.delete(`owner-1:${key}`);
    await h.coordinator.handleEvent({ type: "blur" });
    await h.coordinator.handleEvent(focus, firstReturn);
    assert.deepEqual(h.coordinator.getLaunch(key), { ...launch, returnedAt: firstReturn });
    assert.equal(h.coordinator.getState(key)?.status, "conflict");
  }
});

test("late conflict fetch cannot replace a launch registered while fetching", async () => {
  const h = harness();
  h.server.rows.set(`owner-1:${key}`, { ...launch, returnedAt: firstReturn });
  const gate = deferred();
  h.server.readPlans.push({ after: gate.promise });
  await h.coordinator.handleEvent({ type: "blur" });
  const returning = h.coordinator.handleEvent(focus, laterReturn);
  await waitFor(() => h.server.reads.length > 0, "conflict should reach its fetch");
  h.coordinator.registerLaunch("assignment-1", "listen", { openedAt: newerOpenedAt, returnedAt: null });
  const count = h.published.length;
  gate.resolve();
  await returning;
  assert.equal(h.coordinator.getLaunch(key)?.openedAt, newerOpenedAt);
  assert.equal(h.published.length, count);
});

test("equivalent launch registration preserves pending identity and local first return", async () => {
  const h = harness();
  const gate = deferred();
  h.server.savePlans.push({ before: gate.promise });
  await h.coordinator.handleEvent({ type: "blur" });
  const first = h.coordinator.handleEvent(focus, firstReturn);
  h.coordinator.registerLaunch("assignment-1", "listen", { openedAt: "2026-10-12T01:00:00+00:00", returnedAt: null });
  const duplicate = h.coordinator.handleEvent(visible, laterReturn);
  assert.equal(h.server.saves.length, 1);
  assert.equal(h.coordinator.getLaunch(key)?.returnedAt, firstReturn);
  gate.resolve();
  await Promise.all([first, duplicate]);
  assert.equal(h.coordinator.getState(key)?.status, "saved");
});

test("scope filters foreign assignments, non-audio tasks, malformed keys and already-returned launches", async () => {
  const h = harness({ launches: {
    [key]: { ...launch, returnedAt: firstReturn },
    "assignment-1:shadow": launch, "assignment-2:wordRead": launch,
    "other-child-assignment:listen": launch, "assignment-1:self": launch,
    "assignment-1:unknown": launch, "malformed": launch,
  } });
  h.coordinator.registerLaunch("other-child-assignment", "listen", launch);
  await h.coordinator.handleEvent({ type: "hidden" });
  await h.coordinator.handleEvent(visible, firstReturn);
  assert.deepEqual(h.server.saves.map(({ payload }) => `${payload.assignmentId}:${payload.taskType}`).sort(),
    ["assignment-1:shadow", "assignment-2:wordRead"]);
  assert.equal(h.coordinator.getLaunch("other-child-assignment:listen"), undefined);
  assert.equal(h.coordinator.getLaunch("assignment-1:self"), undefined);
});

test("pageshow must be persisted and visible and have prior departure evidence", async () => {
  const h = harness();
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent({ type: "pageshow", persisted: false, visible: true }, firstReturn);
  await h.coordinator.handleEvent({ type: "pageshow", persisted: true, visible: false }, firstReturn);
  assert.equal(h.server.saves.length, 0);
  await h.coordinator.handleEvent({ type: "pageshow", persisted: true, visible: true }, firstReturn);
  assert.equal(h.server.saves.length, 1);
});

test("initial hidden document provides evidence, while visible reload does not fabricate a return", async () => {
  const h = harness({ initialVisibility: "hidden" });
  await h.coordinator.handleEvent(visible, firstReturn);
  assert.equal(h.server.saves.length, 1);
  const reloaded = harness();
  await reloaded.coordinator.handleEvent({ type: "pageshow", persisted: false, visible: true }, firstReturn);
  await reloaded.coordinator.handleEvent(focus, firstReturn);
  assert.equal(reloaded.server.saves.length, 0);
});

test("return before launch time and older launch snapshots are ignored", async () => {
  const h = harness({ launches: { [key]: { openedAt: newerOpenedAt, returnedAt: null } } });
  h.coordinator.registerLaunch("assignment-1", "listen", launch);
  await h.coordinator.handleEvent({ type: "blur" });
  await h.coordinator.handleEvent(focus, firstReturn);
  assert.equal(h.server.saves.length, 0);
  assert.equal(h.coordinator.getLaunch(key)?.openedAt, newerOpenedAt);
  await h.coordinator.handleEvent(focus, newerReturn);
  assert.equal(h.server.saves.length, 1);
});

test("dispose/profile switch suppresses late save callbacks and all subsequent events", async () => {
  const h = harness();
  const gate = deferred();
  h.server.savePlans.push({ after: gate.promise });
  await h.coordinator.handleEvent({ type: "blur" });
  const oldReturn = h.coordinator.handleEvent(focus, firstReturn);
  const publishedCount = h.published.length;
  const stateCount = h.states.length;
  h.coordinator.dispose();
  const next = harness({ owner: "owner-2", server: h.server });
  await next.coordinator.handleEvent({ type: "blur" });
  await next.coordinator.handleEvent(focus, firstReturn);
  gate.resolve();
  await oldReturn;
  await h.coordinator.handleEvent(visible, laterReturn);
  await h.coordinator.retry(key);
  h.coordinator.registerLaunch("assignment-1", "listen", { openedAt: newerOpenedAt, returnedAt: null });
  assert.equal(h.published.length, publishedCount);
  assert.equal(h.states.length, stateCount);
  assert.equal(h.server.saves.length, 2);
  assert.equal(next.coordinator.getState(key)?.status, "saved");
});

test("dispose during conflict fetch suppresses its launch and state callbacks", async () => {
  const h = harness();
  h.server.rows.set(`owner-1:${key}`, { ...launch, returnedAt: firstReturn });
  const gate = deferred();
  h.server.readPlans.push({ after: gate.promise });
  await h.coordinator.handleEvent({ type: "blur" });
  const returning = h.coordinator.handleEvent(focus, laterReturn);
  await waitFor(() => h.server.reads.length > 0, "return conflict should reach fetch");
  const publishedCount = h.published.length;
  const stateCount = h.states.length;
  h.coordinator.dispose();
  gate.resolve();
  await returning;
  assert.equal(h.published.length, publishedCount);
  assert.equal(h.states.length, stateCount);
});
