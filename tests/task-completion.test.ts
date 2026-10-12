import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompletionAttempt, createCompletionCoordinator, CompletionSaveError,
  type CompletionRequestState, type SavedCompletion,
} from "../lib/task-completion";
import { fetchCompletion, saveCompletionGuarded } from "../lib/supabase/reading-store";
import { completionSupabaseFake, deferred } from "./helpers/completion-supabase-fake";

const key = "assignment-1:listen";
const input = {
  assignmentId: "assignment-1", taskType: "listen" as const, targetCount: 2,
  completedAt: "2026-10-12T01:10:00.000Z",
  launch: { openedAt: "2026-10-12T01:00:00.000Z", returnedAt: "2026-10-12T01:02:01.000Z" },
};

async function waitFor(predicate: () => boolean, message: string) {
  for (let turn = 0; turn < 50 && !predicate(); turn += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.ok(predicate(), message);
}

function harness(fake = completionSupabaseFake(), ownerUserId = "owner-1") {
  const changes: CompletionRequestState[] = [];
  const published: SavedCompletion[] = [];
  const coordinator = createCompletionCoordinator({
    ownerUserId,
    save: (owner, payload, expectedCount) => saveCompletionGuarded(fake.client, owner, payload, expectedCount),
    fetch: (owner, assignmentId, taskType) => fetchCompletion(fake.client, owner, assignmentId, taskType),
    onChange: (_key, state) => changes.push(state),
    onCompletion: (completion) => published.push(completion),
  });
  return { fake, changes, published, coordinator };
}

test("payload preserves elapsed audio time, fallback, non-audio time and count cap", () => {
  const attempt = buildCompletionAttempt(input)!;
  assert.equal(attempt.expectedCount, 0);
  assert.equal(attempt.payload.count, 1);
  assert.equal(attempt.payload.minutes, 3);
  assert.equal(attempt.payload.audioOpenedAt, input.launch.openedAt);
  assert.equal(buildCompletionAttempt({ ...input, launch: undefined })?.payload.minutes, 10);
  assert.equal(buildCompletionAttempt({ ...input, launch: { ...input.launch, returnedAt: null } })?.payload.minutes, 10);
  assert.equal(buildCompletionAttempt({ ...input, taskType: "copywork" })?.payload.minutes, 5);
  assert.equal(buildCompletionAttempt({ ...input, taskType: "copywork" })?.payload.audioOpenedAt, null);
  assert.equal(buildCompletionAttempt({ ...input, targetCount: 0 }), null);
  assert.equal(buildCompletionAttempt({ ...input, completion: {
    count: 2, minutes: 6, completedAt: input.completedAt, audioOpenedAt: input.launch.openedAt,
  } }), null);
});

test("one click stays visibly pending and synchronous second click cannot submit again", async () => {
  const h = harness();
  const gate = deferred();
  h.fake.mutationPlans.push({ before: gate.promise });
  const first = h.coordinator.start(input);
  assert.equal(h.coordinator.getState(key).status, "pending");
  const second = h.coordinator.start(input);
  assert.equal(h.fake.writes.length, 1);
  assert.equal(h.published.length, 0);
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.published[0].value.count, 1);
  assert.equal(h.published[0].value.minutes, 3);
  assert.deepEqual(await fetchCompletion(h.fake.client, "owner-1", "assignment-1", "listen"), h.published[0]);
});

test("same launch can be completed repeatedly up to target despite stale UI input", async () => {
  const h = harness();
  await h.coordinator.start(input);
  await h.coordinator.start(input);
  await h.coordinator.start(input);
  assert.equal(h.fake.writes.length, 2);
  assert.equal(h.fake.rows[0].count, 2);
  assert.equal(h.fake.rows[0].minutes, 6);
  assert.equal(h.fake.rows[0].audio_opened_at, input.launch.openedAt);
});

test("different tasks may save independently; opening audio alone creates no completion", async () => {
  const h = harness();
  assert.deepEqual(h.fake.writes, []);
  const gate = deferred();
  h.fake.mutationPlans.push({ before: gate.promise });
  const pending = h.coordinator.start(input);
  await h.coordinator.start({ ...input, taskType: "shadow" });
  assert.equal(h.fake.rows[0].task_type, "shadow");
  assert.equal(h.coordinator.getState(key).status, "pending");
  gate.resolve();
  await pending;
});

test("explicit save failure requires retry and retains the exact immutable attempt", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ error: { code: "42501", message: "write denied" } });
  await h.coordinator.start(input);
  const state = h.coordinator.getState(key);
  assert.equal(state.status, "error");
  assert.match("message" in state ? state.message : "", /write denied/);
  assert.ok("attempt" in state);
  if (!("attempt" in state)) return;
  assert.ok(Object.isFrozen(state.attempt));
  assert.ok(Object.isFrozen(state.attempt.payload));
  await h.coordinator.start({ ...input, completedAt: "2026-10-12T05:00:00.000Z" });
  assert.equal(h.fake.writes.length, 1);
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.deepEqual(h.fake.writes[1].values, h.fake.writes[0].values);
  assert.equal(h.fake.rows[0].count, 1);
  assert.equal(h.fake.rows[0].completed_at, input.completedAt);
});

test("persisted-but-response-lost is reconciled without another write or increment", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ loseResponse: true });
  await h.coordinator.start(input);
  assert.equal(h.coordinator.getState(key).status, "uncertain");
  assert.equal(h.fake.rows[0].count, 1);
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.fake.writes.length, 1);
  assert.equal(h.published[0].value.count, 1);
});

test("result check accepts equivalent DB timestamp representations", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ loseResponse: true });
  await h.coordinator.start(input);
  h.fake.rows[0].completed_at = "2026-10-12T01:10:00+00:00";
  h.fake.rows[0].audio_opened_at = "2026-10-12T01:00:00+00:00";
  await h.coordinator.checkResult(key);
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.fake.writes.length, 1);
});

test("uncertain status does not unlock a pending attempt; check then retry uses the original payload", async () => {
  const h = harness();
  const gate = deferred();
  h.fake.mutationPlans.push({ before: gate.promise });
  const original = h.coordinator.start(input);
  h.coordinator.markUncertain(key);
  const before = h.coordinator.getState(key);
  await h.coordinator.start(input);
  assert.equal(h.fake.writes.length, 1);
  await h.coordinator.checkResult(key);
  const checked = h.coordinator.getState(key);
  assert.equal(checked.status, "uncertain");
  assert.equal("attempt" in checked && checked.attempt, "attempt" in before && before.attempt);
  await h.coordinator.retry(key);
  gate.resolve();
  await original;
  assert.equal(h.fake.rows[0].count, 1);
  assert.equal(h.published.length, 1);
  assert.deepEqual(h.fake.writes[1].values, h.fake.writes[0].values);
});

test("a late original success can resolve uncertainty without a result check", async () => {
  const h = harness();
  const gate = deferred();
  h.fake.mutationPlans.push({ after: gate.promise });
  const original = h.coordinator.start(input);
  h.coordinator.markUncertain(key);
  gate.resolve();
  await original;
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.published.length, 1);
});

test("failed result check preserves uncertainty and never writes", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ loseResponse: true });
  await h.coordinator.start(input);
  const before = h.coordinator.getState(key);
  h.fake.readPlans.push({ error: { code: "42501", message: "cannot check result" } });
  await h.coordinator.retry(key);
  const after = h.coordinator.getState(key);
  assert.equal(after.status, "uncertain");
  assert.equal("attempt" in after && after.attempt, "attempt" in before && before.attempt);
  assert.equal(h.fake.writes.length, 1);
});

test("result check sees a newer completion and never retries the old payload", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ loseResponse: true });
  await h.coordinator.start(input);
  h.fake.rows[0].count = 2;
  h.fake.rows[0].minutes = 20;
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key).status, "conflict");
  assert.equal(h.fake.writes.length, 1);
  assert.equal(h.published[0].value.count, 2);
  assert.equal(h.fake.rows[0].minutes, 20);
});

test("retry delayed before insert cannot overwrite a newer count committed meanwhile", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ error: { code: "42501", message: "write denied" } });
  await h.coordinator.start(input);
  const gate = deferred();
  h.fake.mutationPlans.push({ before: gate.promise });
  const retry = h.coordinator.retry(key);
  // Let the result check reach its delayed write before another client saves.
  await waitFor(() => h.fake.writes.length >= 2, "retry should reach its delayed write");
  const attempt = buildCompletionAttempt(input)!;
  await saveCompletionGuarded(h.fake.client, "owner-1", attempt.payload, 0);
  await saveCompletionGuarded(h.fake.client, "owner-1", { ...attempt.payload, count: 2, minutes: 20 }, 1);
  gate.resolve();
  await retry;
  assert.equal(h.coordinator.getState(key).status, "conflict");
  assert.equal(h.fake.rows[0].count, 2);
  assert.equal(h.fake.rows[0].minutes, 20);
  assert.equal(h.published[0].value.count, 2);
});

test("late original response cannot regress UI after a result check observes a newer count", async () => {
  const h = harness();
  const gate = deferred();
  h.fake.mutationPlans.push({ after: gate.promise });
  const original = h.coordinator.start(input);
  await waitFor(() => h.fake.rows.length > 0, "original save should commit before its delayed response");
  h.coordinator.markUncertain(key);
  h.fake.rows[0].count = 2;
  h.fake.rows[0].minutes = 20;
  await h.coordinator.checkResult(key);
  gate.resolve();
  await original;
  assert.equal(h.published.length, 1);
  assert.equal(h.published[0].value.count, 2);
  assert.equal(h.coordinator.getState(key).status, "conflict");
});

test("dispose/profile switch ignores late save responses and keeps owners separate", async () => {
  const old = harness();
  const gate = deferred();
  old.fake.mutationPlans.push({ after: gate.promise });
  const pending = old.coordinator.start(input);
  const changeCount = old.changes.length;
  old.coordinator.dispose();
  const next = harness(old.fake, "owner-2");
  await next.coordinator.start(input);
  gate.resolve();
  await pending;
  assert.equal(old.changes.length, changeCount);
  assert.equal(old.published.length, 0);
  assert.equal(next.published.length, 1);
  assert.equal(old.fake.rows.length, 2);
});

test("dispose during result check prevents retry write and UI callbacks", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ error: { code: "42501", message: "write denied" } });
  await h.coordinator.start(input);
  const gate = deferred();
  h.fake.readPlans.push({ before: gate.promise });
  const retry = h.coordinator.retry(key);
  const changeCount = h.changes.length;
  h.coordinator.dispose();
  gate.resolve();
  await retry;
  await h.coordinator.start(input);
  assert.equal(h.fake.writes.length, 1);
  assert.equal(h.changes.length, changeCount);
  assert.equal(h.published.length, 0);
});

test("confirmed failure class exposes readable message and outcome", () => {
  const error = new CompletionSaveError("완료 기록을 저장하지 못했습니다.", "rejected");
  assert.equal(error.message, "완료 기록을 저장하지 못했습니다.");
  assert.equal(error.outcome, "rejected");
});

test("stalled result check can become uncertain and retry without a second increment", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ loseResponse: true });
  await h.coordinator.start(input);
  const gate = deferred();
  h.fake.readPlans.push({ before: gate.promise });
  const stalled = h.coordinator.checkResult(key);
  assert.equal(h.coordinator.getState(key).status, "checking");
  h.coordinator.markUncertain(key);
  assert.equal(h.coordinator.getState(key).status, "uncertain");
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key).status, "success");
  gate.resolve();
  await stalled;
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.fake.writes.length, 1);
  assert.equal(h.published.length, 1);
});

test("late original success resolves a stalled result check and fences its later response", async () => {
  const h = harness();
  const writeGate = deferred();
  h.fake.mutationPlans.push({ after: writeGate.promise });
  const original = h.coordinator.start(input);
  await waitFor(() => h.fake.rows.length > 0, "original save should commit before checking");
  h.coordinator.markUncertain(key);
  const readGate = deferred();
  h.fake.readPlans.push({ before: readGate.promise });
  const checking = h.coordinator.checkResult(key);
  writeGate.resolve();
  await original;
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.published.length, 1);
  readGate.resolve();
  await checking;
  assert.equal(h.coordinator.getState(key).status, "success");
  assert.equal(h.published.length, 1);
});

test("timed out retry check cannot submit after a replacement check succeeds", async () => {
  const h = harness();
  h.fake.mutationPlans.push({ error: { code: "42501", message: "write denied" } });
  await h.coordinator.start(input);
  const gate = deferred();
  h.fake.readPlans.push({ before: gate.promise });
  const stalledRetry = h.coordinator.retry(key);
  h.coordinator.markUncertain(key);
  await h.coordinator.retry(key);
  assert.equal(h.coordinator.getState(key).status, "success");
  gate.resolve();
  await stalledRetry;
  assert.equal(h.fake.writes.length, 2);
  assert.equal(h.fake.rows[0].count, 1);
  assert.equal(h.published.length, 1);
});
