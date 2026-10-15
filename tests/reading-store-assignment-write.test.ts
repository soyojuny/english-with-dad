import assert from "node:assert/strict";
import test from "node:test";
import { deleteAssignment, saveAssignments, saveAssignmentQuizScore, saveAssignmentTaskCounts } from "../lib/supabase/reading-store";
import type { ActivityCategory, TaskCountMap, TaskType } from "../lib/reading-types";

type Mutation = "upsert" | "update" | "delete";
type Filter = { column: string; value: unknown };
type Row = Record<string, unknown>;
type Result = { data: Row[] | Row | null; error: { message: string } | null } | { rejection: Error };
type Plan = { mutation: Mutation; payload?: Row[] | Row; options?: Row; filters?: Filter[]; select?: string; single?: boolean; result: Result };

const owner = "owner-1";
const assignmentColumns = "id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score";
const filters = (id: string): Filter[] => [{ column: "owner_user_id", value: owner }, { column: "id", value: id }];
const saved = {
  id: "assignment-1", owner_user_id: owner, child_id: "child-1", date: "2026-10-15", book_id: "book-1",
  activity_category: "focusListen", tasks: ["listen", "shadow"], task_counts: { listen: 2, shadow: 1 }, quiz_enabled: true, quiz_score: "PASS",
};

function createAssignmentMutationFake(plan: Plan) {
  const expectedEvents = [
    "from",
    plan.mutation,
    ...(plan.filters ?? []).map(({ column }) => `eq:${column}`),
    ...(plan.select ? ["select"] : []),
    ...(plan.single ? ["single"] : []),
    "execute",
  ];
  const actualEvents: string[] = [];
  let fromCalls = 0;
  let started = false;
  let executed = false;
  let mutation: Mutation | undefined;
  let payload: Row[] | Row | undefined;
  let options: Row | undefined;
  let selected: string | undefined;
  let singleCalls = 0;
  const actualFilters: Filter[] = [];

  function record(event: string) {
    assert.ok(actualEvents.length < expectedEvents.length, "예상 밖 체인 호출은 허용하지 않는다");
    assert.equal(event, expectedEvents[actualEvents.length], "mutation 체인 순서는 정확해야 한다");
    actualEvents.push(event);
  }

  function execute() {
    record("execute");
    assert.equal(started, true, "mutation을 시작해야 한다");
    assert.equal(executed, false, "mutation은 한 번만 실행해야 한다");
    assert.equal(mutation, plan.mutation, "예상한 mutation만 사용해야 한다");
    assert.deepEqual(payload, plan.payload, "mutation payload는 정확해야 한다");
    assert.deepEqual(options, plan.options, "mutation option은 정확해야 한다");
    assert.deepEqual(actualFilters, plan.filters ?? [], "owner/id filter는 정확해야 한다");
    assert.equal(selected, plan.select, "select projection은 정확해야 한다");
    assert.equal(singleCalls, plan.single ? 1 : 0, "single 호출 여부는 정확해야 한다");
    assert.deepEqual(actualEvents, expectedEvents, "mutation 체인은 계획한 순서와 정확히 일치해야 한다");
    executed = true;
    if ("rejection" in plan.result) return Promise.reject(plan.result.rejection);
    return Promise.resolve(structuredClone(plan.result));
  }

  const query = {
    upsert(value: Row[], nextOptions: Row) { record("upsert"); assert.equal(started, false, "mutation은 한 번만 시작해야 한다"); started = true; mutation = "upsert"; payload = value; options = nextOptions; return query; },
    update(value: Row) { record("update"); assert.equal(started, false, "mutation은 한 번만 시작해야 한다"); started = true; mutation = "update"; payload = value; return query; },
    delete() { record("delete"); assert.equal(started, false, "mutation은 한 번만 시작해야 한다"); started = true; mutation = "delete"; return query; },
    eq(column: string, value: unknown) { record(`eq:${column}`); actualFilters.push({ column, value }); return query; },
    select(columns: string) { record("select"); assert.equal(selected, undefined, "select는 한 번만 호출해야 한다"); selected = columns; return query; },
    single() { record("single"); singleCalls += 1; assert.equal(singleCalls, 1, "single은 한 번만 호출해야 한다"); return query; },
    then(resolve: (result: Result) => unknown, reject?: (error: unknown) => unknown) { return execute().then(resolve, reject); },
  };

  return {
    client: { from(table: string) { fromCalls += 1; assert.equal(fromCalls, 1, "from은 한 번만 호출해야 한다"); assert.equal(table, "assignments", "assignments table만 허용한다"); record("from"); return query; } } as unknown as Parameters<typeof saveAssignments>[0],
    assertComplete() { assert.equal(executed, true, "예정된 mutation을 실행해야 한다"); assert.deepEqual(actualEvents, expectedEvents, "누락된 체인 호출은 허용하지 않는다"); },
  };
}

test("정상 입력: 배정 batch는 모든 snake_case 필드와 conflict key로 upsert하고 반환 row를 매핑한다", async () => {
  // Given
  const payloads: Array<{ childId: string; date: string; bookId: string; activityCategory: ActivityCategory; tasks: TaskType[]; taskCounts: TaskCountMap; quizEnabled: boolean }> = [
    { childId: "child-1", date: "2026-10-15", bookId: "book-1", activityCategory: "focusListen", tasks: ["listen", "shadow"], taskCounts: { listen: 2, shadow: 1 }, quizEnabled: true },
    { childId: "child-2", date: "2026-10-16", bookId: "book-2", activityCategory: "extraStudy", tasks: ["copywork"], taskCounts: { copywork: 3 }, quizEnabled: false },
  ];
  const fake = createAssignmentMutationFake({ mutation: "upsert", payload: [
    { owner_user_id: owner, child_id: "child-1", date: "2026-10-15", book_id: "book-1", activity_category: "focusListen", tasks: ["listen", "shadow"], task_counts: { listen: 2, shadow: 1 }, quiz_enabled: true },
    { owner_user_id: owner, child_id: "child-2", date: "2026-10-16", book_id: "book-2", activity_category: "extraStudy", tasks: ["copywork"], task_counts: { copywork: 3 }, quiz_enabled: false, quiz_score: null },
  ], options: { onConflict: "owner_user_id,child_id,date,book_id,activity_category" }, select: assignmentColumns, result: { data: [saved, { ...saved, id: "assignment-2", child_id: "child-2", date: "2026-10-16", book_id: "book-2", activity_category: "extraStudy", tasks: ["copywork"], task_counts: { copywork: 3 }, quiz_enabled: false, quiz_score: null }], error: null } });

  // When
  const actual = await saveAssignments(fake.client, owner, payloads);

  // Then
  assert.deepEqual(actual, [
    { id: "assignment-1", childId: "child-1", date: "2026-10-15", bookId: "book-1", activityCategory: "focusListen", tasks: ["listen", "shadow"], taskCounts: { listen: 2, shadow: 1 }, quizEnabled: true, quizScore: "PASS" },
    { id: "assignment-2", childId: "child-2", date: "2026-10-16", bookId: "book-2", activityCategory: "extraStudy", tasks: ["copywork"], taskCounts: { copywork: 3 }, quizEnabled: false, quizScore: null },
  ]);
  fake.assertComplete();
});

test("경계값: 빈 배정 batch는 빈 upsert payload와 빈 반환값을 공개한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "upsert", payload: [], options: { onConflict: "owner_user_id,child_id,date,book_id,activity_category" }, select: assignmentColumns, result: { data: null, error: null } });

  // When
  const actual = await saveAssignments(fake.client, owner, []);

  // Then
  assert.deepEqual(actual, []);
  fake.assertComplete();
});

test("잘못된 입력/실패: 배정 batch DB error는 성공 결과로 바꾸지 않는다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "upsert", payload: [], options: { onConflict: "owner_user_id,child_id,date,book_id,activity_category" }, select: assignmentColumns, result: { data: null, error: { message: "assignment denied" } } });

  // When
  const actual = saveAssignments(fake.client, owner, []);

  // Then
  await assert.rejects(actual, /assignment denied/);
  fake.assertComplete();
});

test("정상 입력: PASS 퀴즈 결과는 owner/id 범위와 exact select/single 결과로 저장한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { quiz_score: "PASS" }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: saved, error: null } });

  // When
  const actual = await saveAssignmentQuizScore(fake.client, owner, "assignment-1", "PASS");

  // Then
  assert.equal(actual.quizScore, "PASS");
  fake.assertComplete();
});

test("정상 입력: FAIL 퀴즈 결과는 반환 row를 도메인 배정으로 매핑한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { quiz_score: "FAIL" }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: { ...saved, quiz_score: "FAIL" }, error: null } });

  // When
  const actual = await saveAssignmentQuizScore(fake.client, owner, "assignment-1", "FAIL");

  // Then
  assert.equal(actual.quizScore, "FAIL");
  fake.assertComplete();
});

test("잘못된 입력/실패: 퀴즈 저장의 data null은 성공 배정으로 반환하지 않는다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { quiz_score: "PASS" }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: null, error: null } });

  // When
  const actual = saveAssignmentQuizScore(fake.client, owner, "assignment-1", "PASS");

  // Then
  await assert.rejects(actual, /퀴즈 결과를 저장하지 못했습니다/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 퀴즈 저장 DB error는 전용 오류로 전파한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { quiz_score: "PASS" }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: null, error: { message: "quiz denied" } } });

  // When
  const actual = saveAssignmentQuizScore(fake.client, owner, "assignment-1", "PASS");

  // Then
  await assert.rejects(actual, /quiz denied/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 퀴즈 저장 Promise rejection은 전파한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { quiz_score: "PASS" }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { rejection: new Error("quiz network") } });

  // When
  const actual = saveAssignmentQuizScore(fake.client, owner, "assignment-1", "PASS");

  // Then
  await assert.rejects(actual, /quiz network/);
  fake.assertComplete();
});

test("정상 입력: 할 일 횟수와 quizEnabled true는 기존 quiz score를 덮지 않고 저장한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { tasks: ["listen"], task_counts: { listen: 3 }, quiz_enabled: true }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: { ...saved, tasks: ["listen"], task_counts: { listen: 3 } }, error: null } });

  // When
  const actual = await saveAssignmentTaskCounts(fake.client, owner, "assignment-1", { tasks: ["listen"], taskCounts: { listen: 3 }, quizEnabled: true });

  // Then
  assert.deepEqual(actual.taskCounts, { listen: 3 });
  fake.assertComplete();
});

test("경계값: 퀴즈를 Y에서 N으로 바꾸면 score를 null로 초기화한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { tasks: [], task_counts: {}, quiz_enabled: false, quiz_score: null }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: { ...saved, tasks: [], task_counts: {}, quiz_enabled: false, quiz_score: null }, error: null } });

  // When
  const actual = await saveAssignmentTaskCounts(fake.client, owner, "assignment-1", { tasks: [], taskCounts: {}, quizEnabled: false });

  // Then
  assert.deepEqual(actual, { id: "assignment-1", childId: "child-1", date: "2026-10-15", bookId: "book-1", activityCategory: "focusListen", tasks: [], taskCounts: {}, quizEnabled: false, quizScore: null });
  fake.assertComplete();
});

test("잘못된 입력/실패: 할 일 횟수 저장 DB error는 전파한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { tasks: ["listen"], task_counts: { listen: 1 }, quiz_enabled: true }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: null, error: { message: "counts denied" } } });

  // When
  const actual = saveAssignmentTaskCounts(fake.client, owner, "assignment-1", { tasks: ["listen"], taskCounts: { listen: 1 }, quizEnabled: true });

  // Then
  await assert.rejects(actual, /counts denied/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 할 일 횟수 저장 data null은 전용 메시지로 reject한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "update", payload: { tasks: ["listen"], task_counts: { listen: 1 }, quiz_enabled: true }, filters: filters("assignment-1"), select: assignmentColumns, single: true, result: { data: null, error: null } });

  // When
  const actual = saveAssignmentTaskCounts(fake.client, owner, "assignment-1", { tasks: ["listen"], taskCounts: { listen: 1 }, quizEnabled: true });

  // Then
  await assert.rejects(actual, /할 일 횟수를 수정하지 못했습니다/);
  fake.assertComplete();
});

test("정상 입력: 배정 삭제는 owner/id 범위에서 성공 후 undefined를 반환한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "delete", filters: filters("assignment-1"), result: { data: null, error: null } });

  // When
  const actual = await deleteAssignment(fake.client, owner, "assignment-1");

  // Then
  assert.equal(actual, undefined);
  fake.assertComplete();
});

test("잘못된 입력/실패: 배정 삭제 DB error는 전파한다", async () => {
  // Given
  const fake = createAssignmentMutationFake({ mutation: "delete", filters: filters("assignment-1"), result: { data: null, error: { message: "delete denied" } } });

  // When
  const actual = deleteAssignment(fake.client, owner, "assignment-1");

  // Then
  await assert.rejects(actual, /delete denied/);
  fake.assertComplete();
});
