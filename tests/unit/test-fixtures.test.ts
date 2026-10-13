import test from "node:test";
import assert from "node:assert/strict";
import { buildAssignmentActivityLogs, getLaunchMinutes } from "../../lib/reading-calculations";
import { saveCompletionGuarded } from "../../lib/supabase/reading-store";
import { deferred, fixedClock } from "../helpers/async-fixtures";
import { completionSupabaseFake } from "../helpers/completion-supabase-fake";
import { readingFixture } from "../helpers/reading-fixture";

test("T01-N02: 한 도메인 fixture의 완료와 중첩 자료 변경은 다른 fixture에 영향을 주지 않는다", () => {
  // Given
  const first = readingFixture();
  const second = readingFixture();
  first.completions["assignment-1:listen"] = {
    completedAt: "2026-10-12T01:02:01.000Z", minutes: 3,
    audioOpenedAt: "2026-10-12T01:00:00.000Z", count: 1,
  };
  first.books[0].audio.listen = "https://example.com/changed";
  first.assignments[0].tasks.push("shadow");
  first.assignments[0].taskCounts.listen = 2;
  first.children[0].name = "변경한 아동";
  first.audioLaunches["assignment-1:listen"] = { openedAt: "2026-10-12T01:00:00.000Z", returnedAt: null };
  first.manualLogs.push({
    id: "manual-1", childId: "child-1", date: "2026-10-12", type: "korean",
    title: "한글책", minutes: 5, note: "", count: 1,
  });

  // When
  const firstLogs = buildAssignmentActivityLogs(first);
  const secondLogs = buildAssignmentActivityLogs(second);

  // Then
  assert.equal(firstLogs.length, 1);
  assert.equal(firstLogs[0].id, "assignment-1:listen");
  assert.equal(firstLogs[0].minutes, 3);
  assert.deepEqual(secondLogs, []);
  assert.equal(second.books[0].audio.listen, "https://example.com/listen");
  assert.deepEqual(second.assignments[0].tasks, ["listen"]);
  assert.deepEqual(second.assignments[0].taskCounts, { listen: 1 });
  assert.equal(second.children[0].name, "테스트 아동");
  assert.deepEqual(second.audioLaunches, {});
  assert.deepEqual(second.manualLogs, []);
});

test("T01-N03: 제어 Promise가 풀리기 전에는 완료 row가 저장되지 않고 풀린 뒤 1회 저장된다", async () => {
  // Given
  const gate = deferred();
  const fake = completionSupabaseFake();
  const independent = completionSupabaseFake();
  fake.mutationPlans.push({ before: gate.promise });
  const payload = {
    assignmentId: "assignment-1", taskType: "listen" as const, count: 1, minutes: 3,
    completedAt: "2026-10-12T01:02:01.000Z", audioOpenedAt: "2026-10-12T01:00:00.000Z",
  };

  // When
  const pending = saveCompletionGuarded(fake.client, "owner-1", payload, 0);
  const beforeRelease = structuredClone(fake.rows);
  gate.resolve();
  const result = await pending;

  // Then
  assert.deepEqual(beforeRelease, []);
  assert.equal(result.status, "saved");
  assert.equal(result.completion?.value.count, 1);
  assert.equal(result.completion?.value.minutes, 3);
  assert.equal(fake.rows.length, 1);
  assert.deepEqual(independent.rows, []);
  assert.deepEqual(independent.writes, []);
  assert.deepEqual(independent.mutationPlans, []);
});

test("T01-E04: 시계를 2분 1초 이동하면 청취는 3분이고 다른 시계는 시작 시각을 유지한다", () => {
  // Given
  const clock = fixedClock("2026-10-12T01:00:00.000Z");
  const independent = fixedClock("2026-10-12T01:00:00.000Z");
  const openedAt = clock.now();

  // When
  clock.advance(121_000);
  const returnedAt = clock.now();
  const minutes = getLaunchMinutes({ openedAt, returnedAt }, 10);

  // Then
  assert.equal(returnedAt, "2026-10-12T01:02:01.000Z");
  assert.equal(minutes, 3);
  assert.equal(independent.now(), "2026-10-12T01:00:00.000Z");
});

test("T01-F03: 제어 Promise가 거부되면 저장은 실패하고 완료 row를 만들지 않는다", async () => {
  // Given
  const gate = deferred();
  const fake = completionSupabaseFake();
  fake.mutationPlans.push({ before: gate.promise });

  // When
  const pending = saveCompletionGuarded(fake.client, "owner-1", {
    assignmentId: "assignment-1", taskType: "listen", count: 1, minutes: 3,
    completedAt: "2026-10-12T01:02:01.000Z", audioOpenedAt: "2026-10-12T01:00:00.000Z",
  }, 0);
  const rejected = assert.rejects(pending, /test transport rejected/);
  gate.reject(new Error("test transport rejected"));

  // Then
  await rejected;
  assert.deepEqual(fake.rows, []);
});
