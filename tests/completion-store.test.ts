import test from "node:test";
import assert from "node:assert/strict";
import { fetchCompletion, saveCompletionGuarded } from "../lib/supabase/reading-store";
import { CompletionSaveError } from "../lib/task-completion";
import { completionSupabaseFake, type CompletionRow } from "./helpers/completion-supabase-fake";
import { deferred } from "./helpers/async-fixtures";

const payload = {
  assignmentId: "assignment-1", taskType: "listen" as const,
  completedAt: "2026-10-12T01:10:00.000Z", minutes: 10,
  audioOpenedAt: "2026-10-12T01:00:00.000Z", count: 1,
};
const row: CompletionRow = {
  owner_user_id: "owner-1", assignment_id: payload.assignmentId, task_type: payload.taskType,
  completed_at: payload.completedAt, minutes: payload.minutes,
  audio_opened_at: payload.audioOpenedAt, count: payload.count,
};
const record = { key: "assignment-1:listen", value: {
  completedAt: payload.completedAt, minutes: payload.minutes, audioOpenedAt: payload.audioOpenedAt, count: 1,
} };

test("fetchCompletion selects only the owner's assignment and task and maps null", async () => {
  const decoys: CompletionRow[] = [
    { ...row, owner_user_id: "owner-2" }, { ...row, assignment_id: "assignment-2" },
    { ...row, task_type: "shadow" },
  ];
  const fake = completionSupabaseFake([row, ...decoys]);
  assert.deepEqual(await fetchCompletion(fake.client, "owner-1", "assignment-1", "listen"), record);
  assert.equal(await fetchCompletion(fake.client, "owner-1", "missing", "listen"), null);
  assert.deepEqual(fake.writes, []);
});

test("first guarded completion inserts instead of upserting", async () => {
  const fake = completionSupabaseFake();
  assert.deepEqual(await saveCompletionGuarded(fake.client, "owner-1", payload, 0), { status: "saved", completion: record });
  assert.deepEqual(fake.rows, [row]);
  assert.equal(fake.writes[0].operation, "insert");
});

test("a repeated first insert reconciles unique conflict without overwriting minutes or count", async () => {
  const newer = { ...row, count: 2, minutes: 20, completed_at: "2026-10-12T01:20:00.000Z" };
  const fake = completionSupabaseFake([newer]);
  const result = await saveCompletionGuarded(fake.client, "owner-1", payload, 0);
  assert.equal(result.status, "conflict");
  assert.equal(result.completion?.value.count, 2);
  assert.deepEqual(fake.rows, [newer]);
});

test("subsequent guarded completion updates only its owner, assignment, task and expected count", async () => {
  const decoys: CompletionRow[] = [
    { ...row, owner_user_id: "owner-2" }, { ...row, assignment_id: "assignment-2" }, { ...row, task_type: "shadow" },
  ];
  const fake = completionSupabaseFake([row, ...decoys]);
  const next = { ...payload, count: 2, minutes: 20 };
  const result = await saveCompletionGuarded(fake.client, "owner-1", next, 1);
  assert.equal(result.status, "saved");
  assert.equal(result.completion?.value.count, 2);
  assert.deepEqual(fake.rows, [{ ...row, count: 2, minutes: 20 }, ...decoys]);
  assert.equal(fake.writes[0].operation, "update");
});

test("old expected-count retry cannot regress a newer completion", async () => {
  const newer = { ...row, count: 3, minutes: 30 };
  const fake = completionSupabaseFake([newer]);
  const result = await saveCompletionGuarded(fake.client, "owner-1", { ...payload, count: 2, minutes: 20 }, 1);
  assert.equal(result.status, "conflict");
  assert.equal(result.completion?.value.count, 3);
  assert.deepEqual(fake.rows, [newer]);
});

test("delayed guarded update checks count at DB mutation time", async () => {
  const fake = completionSupabaseFake([row]);
  const gate = deferred();
  fake.mutationPlans.push({ before: gate.promise });
  const oldRequest = saveCompletionGuarded(fake.client, "owner-1", { ...payload, count: 2, minutes: 20 }, 1);
  await saveCompletionGuarded(fake.client, "owner-1", { ...payload, count: 2, minutes: 22 }, 1);
  await saveCompletionGuarded(fake.client, "owner-1", { ...payload, count: 3, minutes: 33 }, 2);
  gate.resolve();
  assert.equal((await oldRequest).completion?.value.count, 3);
  assert.equal(fake.rows[0].count, 3);
  assert.equal(fake.rows[0].minutes, 33);
});

test("missing expected-count row is conflict and is never recreated", async () => {
  const fake = completionSupabaseFake();
  assert.deepEqual(await saveCompletionGuarded(fake.client, "owner-1", { ...payload, count: 2 }, 1), {
    status: "conflict", completion: null,
  });
  assert.deepEqual(fake.rows, []);
});

test("guarded save rejects invalid count transitions without a write", async () => {
  const fake = completionSupabaseFake();
  await assert.rejects(saveCompletionGuarded(fake.client, "owner-1", { ...payload, count: 4 }, 1));
  assert.deepEqual(fake.writes, []);
});

test("confirmed DB rejection is an explicit failure; unknown transport outcome stays uncertain", async () => {
  const fake = completionSupabaseFake();
  fake.mutationPlans.push({ error: { code: "42501", message: "write denied" } });
  await assert.rejects(saveCompletionGuarded(fake.client, "owner-1", payload, 0),
    (error) => error instanceof CompletionSaveError && error.outcome === "rejected" && error.message === "write denied");
  fake.mutationPlans.push({ error: { code: "", message: "fetch failed" } });
  await assert.rejects(saveCompletionGuarded(fake.client, "owner-1", payload, 0),
    (error) => error instanceof CompletionSaveError && error.outcome === "uncertain");
});

test("fetch and unique-conflict reconciliation propagate read errors", async () => {
  const fake = completionSupabaseFake([row]);
  fake.readPlans.push({ error: { code: "42501", message: "read denied" } });
  await assert.rejects(fetchCompletion(fake.client, "owner-1", "assignment-1", "listen"), /read denied/);
  fake.readPlans.push({ error: { code: "42501", message: "reconciliation denied" } });
  await assert.rejects(saveCompletionGuarded(fake.client, "owner-1", payload, 0), /reconciliation denied/);
});
