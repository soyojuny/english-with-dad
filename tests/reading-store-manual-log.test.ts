import assert from "node:assert/strict";
import test from "node:test";
import { deleteManualLog, saveManualLog } from "../lib/supabase/reading-store";

type Mutation = "insert" | "delete";
type Filter = { column: string; value: unknown };
type Row = Record<string, unknown>;
type Result = { data: Row | null; error: { message: string } | null } | { rejection: Error };
type Plan = { mutation: Mutation; payload?: Row; filters?: Filter[]; select?: string; result: Result };

const owner = "owner-1";
const logColumns = "id, child_id, date, type, title, minutes, note";
const saved = { id: "log-1", child_id: "child-1", date: "2026-10-15", type: "dvd", title: "Bluey", minutes: 0, note: "" };

function createManualLogMutationFake(plan: Plan) {
  const expectedEvents = ["from", plan.mutation, ...(plan.filters ?? []).map(({ column }) => `eq:${column}`), "select", "single", "execute"];
  const actualEvents: string[] = [];
  let fromCalls = 0;
  let started = false;
  let executed = false;
  let mutation: Mutation | undefined;
  let payload: Row | undefined;
  let selected: string | undefined;
  let singleCalls = 0;
  const filters: Filter[] = [];
  function record(event: string) {
    assert.ok(actualEvents.length < expectedEvents.length, "예상 밖 체인 호출은 허용하지 않는다");
    assert.equal(event, expectedEvents[actualEvents.length], "mutation 체인 순서는 정확해야 한다");
    actualEvents.push(event);
  }
  function execute() {
    record("execute");
    assert.equal(executed, false, "mutation은 한 번만 실행해야 한다");
    assert.equal(mutation, plan.mutation, "예상한 mutation만 사용해야 한다");
    assert.deepEqual(payload, plan.payload, "mutation payload는 정확해야 한다");
    assert.deepEqual(filters, plan.filters ?? [], "owner/id filter는 정확해야 한다");
    assert.equal(selected, plan.select, "select projection은 정확해야 한다");
    assert.equal(singleCalls, 1, "single은 한 번만 호출해야 한다");
    assert.deepEqual(actualEvents, expectedEvents, "mutation 체인은 계획한 순서와 정확히 일치해야 한다");
    executed = true;
    if ("rejection" in plan.result) return Promise.reject(plan.result.rejection);
    return Promise.resolve(structuredClone(plan.result));
  }
  const query = {
    insert(value: Row) { record("insert"); assert.equal(started, false, "mutation은 한 번만 시작해야 한다"); started = true; mutation = "insert"; payload = value; return query; },
    delete() { record("delete"); assert.equal(started, false, "mutation은 한 번만 시작해야 한다"); started = true; mutation = "delete"; return query; },
    eq(column: string, value: unknown) { record(`eq:${column}`); filters.push({ column, value }); return query; },
    select(columns: string) { record("select"); assert.equal(selected, undefined, "select는 한 번만 호출해야 한다"); selected = columns; return query; },
    single() { record("single"); singleCalls += 1; assert.equal(singleCalls, 1, "single은 한 번만 호출해야 한다"); return query; },
    then(resolve: (result: Result) => unknown, reject?: (error: unknown) => unknown) { return execute().then(resolve, reject); },
  };
  return {
    client: { from(table: string) { fromCalls += 1; assert.equal(fromCalls, 1, "from은 한 번만 호출해야 한다"); assert.equal(table, "manual_logs", "manual_logs table만 허용한다"); record("from"); return query; } } as unknown as Parameters<typeof saveManualLog>[0],
    assertComplete() { assert.equal(started, true, "mutation을 시작해야 한다"); assert.equal(executed, true, "예정된 mutation을 실행해야 한다"); assert.deepEqual(actualEvents, expectedEvents, "누락된 체인 호출은 허용하지 않는다"); },
  };
}

test("경계값: 빈 note와 0분 수기 기록은 owner 포함 전체 payload로 저장하고 반환 row를 매핑한다", async () => {
  // Given
  const input = { childId: "child-1", date: "2026-10-15", type: "dvd" as const, title: "Bluey", minutes: 0, note: "" };
  const fake = createManualLogMutationFake({ mutation: "insert", payload: { owner_user_id: owner, child_id: "child-1", date: "2026-10-15", type: "dvd", title: "Bluey", minutes: 0, note: "" }, select: logColumns, result: { data: saved, error: null } });

  // When
  const actual = await saveManualLog(fake.client, owner, input);

  // Then
  assert.deepEqual(actual, { id: "log-1", childId: "child-1", date: "2026-10-15", type: "dvd", title: "Bluey", minutes: 0, note: "", count: 1 });
  fake.assertComplete();
});

test("잘못된 입력/실패: 수기 기록 저장 data null은 성공 기록으로 반환하지 않는다", async () => {
  // Given
  const input = { childId: "child-1", date: "2026-10-15", type: "dvd" as const, title: "Bluey", minutes: 10, note: "메모" };
  const fake = createManualLogMutationFake({ mutation: "insert", payload: { owner_user_id: owner, child_id: "child-1", date: "2026-10-15", type: "dvd", title: "Bluey", minutes: 10, note: "메모" }, select: logColumns, result: { data: null, error: null } });

  // When
  const actual = saveManualLog(fake.client, owner, input);

  // Then
  await assert.rejects(actual, /수기 기록을 저장하지 못했습니다/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 수기 기록 저장 DB error는 전용 오류로 전파한다", async () => {
  // Given
  const input = { childId: "child-1", date: "2026-10-15", type: "dvd" as const, title: "Bluey", minutes: 10, note: "메모" };
  const fake = createManualLogMutationFake({ mutation: "insert", payload: { owner_user_id: owner, child_id: "child-1", date: "2026-10-15", type: "dvd", title: "Bluey", minutes: 10, note: "메모" }, select: logColumns, result: { data: null, error: { message: "manual save denied" } } });

  // When
  const actual = saveManualLog(fake.client, owner, input);

  // Then
  await assert.rejects(actual, /manual save denied/);
  fake.assertComplete();
});

test("정상 입력: 수기 기록 삭제는 owner/id filter와 id select/single 뒤 요청 id를 반환한다", async () => {
  // Given
  const fake = createManualLogMutationFake({ mutation: "delete", filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "log-1" }], select: "id", result: { data: { id: "log-1" }, error: null } });

  // When
  const actual = await deleteManualLog(fake.client, owner, "log-1");

  // Then
  assert.equal(actual, "log-1");
  fake.assertComplete();
});

test("잘못된 입력/실패: 수기 기록 삭제 single data null은 성공 id로 반환하지 않는다", async () => {
  // Given
  const fake = createManualLogMutationFake({ mutation: "delete", filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "log-1" }], select: "id", result: { data: null, error: null } });

  // When
  const actual = deleteManualLog(fake.client, owner, "log-1");

  // Then
  await assert.rejects(actual, /수기 기록을 삭제하지 못했습니다/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 수기 기록 삭제 DB error는 전용 오류로 전파한다", async () => {
  // Given
  const fake = createManualLogMutationFake({ mutation: "delete", filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "log-1" }], select: "id", result: { data: null, error: { message: "manual delete denied" } } });

  // When
  const actual = deleteManualLog(fake.client, owner, "log-1");

  // Then
  await assert.rejects(actual, /manual delete denied/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 수기 기록 삭제 Promise rejection은 전파한다", async () => {
  // Given
  const fake = createManualLogMutationFake({ mutation: "delete", filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "log-1" }], select: "id", result: { rejection: new Error("manual delete network") } });

  // When
  const actual = deleteManualLog(fake.client, owner, "log-1");

  // Then
  await assert.rejects(actual, /manual delete network/);
  fake.assertComplete();
});
