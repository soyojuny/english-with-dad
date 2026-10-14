import assert from "node:assert/strict";
import test from "node:test";
import { fetchParentActivityData } from "../lib/supabase/reading-store";

type TableName = "children" | "assignments" | "manual_logs" | "books" | "completions" | "audio_launches";
type Row = Record<string, unknown> & { owner_user_id: string };
type Filter = { operator: "eq" | "gte" | "lte" | "in"; column: string; value: unknown };
type QueryFailure = { error: { message: string } } | { rejection: Error };
type ExpectedQuery = {
  table: TableName;
  select: string;
  filters: Filter[];
  order?: string;
  rows?: Row[] | null;
  failure?: QueryFailure;
};

const owner = "owner-1";
const range = { startKey: "2026-10-14", endKey: "2026-10-20" };
const bookColumns = "id, owner_user_id, active, content_type, series, title, volume, level, cover, audio_listen, audio_shadow, note";
const assignmentColumns = "id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score";

const initialQueries: ExpectedQuery[] = [
  {
    table: "children",
    select: "id, owner_user_id, name, level, goal",
    filters: [{ operator: "eq", column: "owner_user_id", value: owner }],
    order: "created_at",
  },
  {
    table: "assignments",
    select: assignmentColumns,
    filters: [
      { operator: "eq", column: "owner_user_id", value: owner },
      { operator: "gte", column: "date", value: range.startKey },
      { operator: "lte", column: "date", value: range.endKey },
    ],
    order: "date",
  },
  {
    table: "manual_logs",
    select: "id, child_id, date, type, title, minutes, note",
    filters: [
      { operator: "eq", column: "owner_user_id", value: owner },
      { operator: "gte", column: "date", value: range.startKey },
      { operator: "lte", column: "date", value: range.endKey },
    ],
    order: "date",
  },
];

function followUpQueries(assignmentIds: string[], bookIds: string[]): ExpectedQuery[] {
  return [
    {
      table: "books",
      select: bookColumns,
      filters: [
        { operator: "eq", column: "owner_user_id", value: owner },
        { operator: "in", column: "id", value: bookIds },
      ],
    },
    {
      table: "completions",
      select: "assignment_id, task_type, completed_at, minutes, audio_opened_at, count",
      filters: [
        { operator: "eq", column: "owner_user_id", value: owner },
        { operator: "in", column: "assignment_id", value: assignmentIds },
      ],
    },
    {
      table: "audio_launches",
      select: "assignment_id, task_type, opened_at, returned_at",
      filters: [
        { operator: "eq", column: "owner_user_id", value: owner },
        { operator: "in", column: "assignment_id", value: assignmentIds },
      ],
    },
  ];
}

function createParentQueryFake(expectedQueries: ExpectedQuery[]) {
  const expectedByTable = new Map(expectedQueries.map((query) => [query.table, query]));
  assert.equal(expectedByTable.size, expectedQueries.length, "대역의 예상 table은 중복될 수 없다");
  const consumedTables = new Set<TableName>();

  function from(table: string) {
    const expected = expectedByTable.get(table as TableName);
    if (!expected) throw new Error(`불필요한 ${table} 조회는 허용하지 않는다`);
    const expectedQuery: ExpectedQuery = expected;
    assert.ok(!consumedTables.has(expectedQuery.table), `${table} 조회는 한 번만 허용한다`);
    consumedTables.add(expectedQuery.table);
    const filters: Filter[] = [];
    let selectedColumns: string | undefined;
    let orderedBy: string | undefined;
    let execution: Promise<{ data: Row[] | null; error: { message: string } | null }> | undefined;

    function execute() {
      execution ??= Promise.resolve().then(() => {
        assert.equal(selectedColumns, expectedQuery.select, `${expectedQuery.table} 조회는 정확한 select projection을 사용해야 한다`);
        assert.deepEqual(filters, expectedQuery.filters, `${expectedQuery.table} 조회는 owner·기간·in 필터의 연산자와 값을 정확히 사용해야 한다`);
        assert.equal(orderedBy, expectedQuery.order, `${expectedQuery.table} 조회는 필요한 정렬만 사용해야 한다`);
        if (expectedQuery.failure && "rejection" in expectedQuery.failure) throw expectedQuery.failure.rejection;
        if (expectedQuery.failure && "error" in expectedQuery.failure) return { data: null, error: expectedQuery.failure.error };
        return { data: expectedQuery.rows === undefined ? [] : structuredClone(expectedQuery.rows), error: null };
      });
      return execution;
    }

    const query = {
      select(columns: string) { assert.equal(selectedColumns, undefined, `${expectedQuery.table} select는 한 번만 호출해야 한다`); selectedColumns = columns; return query; },
      eq(column: string, value: unknown) { filters.push({ operator: "eq", column, value }); return query; },
      gte(column: string, value: unknown) { filters.push({ operator: "gte", column, value }); return query; },
      lte(column: string, value: unknown) { filters.push({ operator: "lte", column, value }); return query; },
      in(column: string, value: unknown) { filters.push({ operator: "in", column, value }); return query; },
      order(column: string, options: { ascending: boolean }) { assert.deepEqual(options, { ascending: true }); assert.equal(orderedBy, undefined, `${expectedQuery.table} order는 한 번만 호출해야 한다`); orderedBy = column; return query; },
      then(resolve: (result: { data: Row[] | null; error: { message: string } | null }) => unknown, reject?: (error: unknown) => unknown) { return execute().then(resolve, reject); },
    };
    return query;
  }

  return {
    client: { from } as unknown as Parameters<typeof fetchParentActivityData>[0],
    assertComplete() { assert.deepEqual(consumedTables, new Set(expectedByTable.keys()), "예정된 조회를 생략하면 안 된다"); },
  };
}

const rows = {
  children: [{ id: "child-1", owner_user_id: owner, name: "지율", level: "A", goal: "매일 읽기" }],
  assignments: [
    { id: "assignment-1", owner_user_id: owner, child_id: "child-1", date: "2026-10-14", book_id: "book-1", activity_category: "focusListen", tasks: ["listen"], task_counts: { listen: 2 }, quiz_enabled: true, quiz_score: "PASS" },
    { id: "assignment-2", owner_user_id: owner, child_id: "child-1", date: "2026-10-15", book_id: "book-1", activity_category: "focusListen", tasks: ["shadow"], task_counts: { shadow: 1 }, quiz_enabled: false, quiz_score: null },
    { id: "assignment-3", owner_user_id: owner, child_id: "child-1", date: "2026-10-20", book_id: "book-2", activity_category: "extraStudy", tasks: ["wordRead"], task_counts: { wordRead: 1 }, quiz_enabled: false, quiz_score: null },
  ],
  manual_logs: [{ id: "manual-1", owner_user_id: owner, child_id: "child-1", date: "2026-10-20", type: "dvd", title: "DVD", minutes: 20, note: "함께 봄" }],
  books: [
    { id: "book-1", owner_user_id: owner, active: true, content_type: "book", series: "그림", title: "첫 책", volume: "1", level: "A", cover: "/first.jpg", audio_listen: "listen", audio_shadow: "shadow", note: "" },
    { id: "book-2", owner_user_id: owner, active: false, content_type: "wordReading", series: "단어", title: "둘째 책", volume: "2", level: "B", cover: "/second.jpg", audio_listen: "word", audio_shadow: "", note: "" },
  ],
  completions: [{ owner_user_id: owner, assignment_id: "assignment-1", task_type: "listen", completed_at: "2026-10-14T01:00:00.000Z", minutes: 10, audio_opened_at: null, count: 2 }],
  audio_launches: [{ owner_user_id: owner, assignment_id: "assignment-3", task_type: "wordRead", opened_at: "2026-10-20T01:00:00.000Z", returned_at: null }],
};

function successfulQueries(): ExpectedQuery[] {
  return [
    ...initialQueries.map((query) => ({ ...query, rows: rows[query.table as "children" | "assignments" | "manual_logs"] })),
    ...followUpQueries(["assignment-1", "assignment-2", "assignment-3"], ["book-1", "book-2"]).map((query) => ({ ...query, rows: rows[query.table as "books" | "completions" | "audio_launches"] })),
  ];
}

test("정상 입력: 부모 활동 조회는 owner와 기간 양 끝을 제한하고 공유 책 ID의 후속 in 조회를 한 번으로 묶는다", async () => {
  // Given
  const fake = createParentQueryFake(successfulQueries());

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.deepEqual(actual.assignments.map((item) => item.id), ["assignment-1", "assignment-2", "assignment-3"]);
  assert.deepEqual(actual.books.map((item) => item.id), ["book-1", "book-2"]);
  assert.deepEqual(actual.completions, { "assignment-1:listen": { completedAt: "2026-10-14T01:00:00.000Z", minutes: 10, audioOpenedAt: null, count: 2 } });
  assert.deepEqual(actual.audioLaunches, { "assignment-3:wordRead": { openedAt: "2026-10-20T01:00:00.000Z", returnedAt: null } });
  fake.assertComplete();
});

test("경계값: 배정이 없으면 수동 기록을 유지하고 빈 in 후속 조회를 만들지 않는다", async () => {
  // Given
  const fake = createParentQueryFake([
    { ...initialQueries[0], rows: rows.children },
    { ...initialQueries[1], rows: [] },
    { ...initialQueries[2], rows: rows.manual_logs },
  ]);

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.deepEqual(actual, {
    children: [{ id: "child-1", name: "지율", level: "A", goal: "매일 읽기" }],
    books: [], assignments: [], completions: {}, audioLaunches: {},
    manualLogs: [{ id: "manual-1", childId: "child-1", date: "2026-10-20", type: "dvd", title: "DVD", minutes: 20, note: "함께 봄", count: 1 }],
  });
  fake.assertComplete();
});

test("경계값: 초기 assignments data null은 빈 배정과 후속 빈 결과로 처리한다", async () => {
  // Given
  const queries = successfulQueries().slice(0, 3);
  queries.find((query) => query.table === "assignments")!.rows = null;
  const fake = createParentQueryFake(queries);

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.deepEqual(actual.assignments, []);
  assert.deepEqual(actual.books, []);
  assert.deepEqual(actual.completions, {});
  assert.deepEqual(actual.audioLaunches, {});
  fake.assertComplete();
});

test("경계값: 후속 books data null은 빈 책 목록으로 처리한다", async () => {
  // Given
  const queries = successfulQueries();
  queries.find((query) => query.table === "books")!.rows = null;
  const fake = createParentQueryFake(queries);

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.deepEqual(actual.books, []);
  fake.assertComplete();
});

test("경계값: task_counts가 null인 배정은 빈 횟수 맵으로 매핑한다", async () => {
  // Given
  const queries = successfulQueries();
  const assignmentsQuery = queries.find((query) => query.table === "assignments")!;
  assignmentsQuery.rows = rows.assignments.map((row, index) => index === 0 ? { ...row, task_counts: null } : row);
  const fake = createParentQueryFake(queries);

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.deepEqual(actual.assignments[0].taskCounts, {});
  fake.assertComplete();
});

test("경계값: quiz_enabled가 null인 배정은 false로 매핑한다", async () => {
  // Given
  const queries = successfulQueries();
  const assignmentsQuery = queries.find((query) => query.table === "assignments")!;
  assignmentsQuery.rows = rows.assignments.map((row, index) => index === 0 ? { ...row, quiz_enabled: null } : row);
  const fake = createParentQueryFake(queries);

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.equal(actual.assignments[0].quizEnabled, false);
  fake.assertComplete();
});

test("경계값: content_type이 null인 책은 book으로 매핑한다", async () => {
  // Given
  const queries = successfulQueries();
  const booksQuery = queries.find((query) => query.table === "books")!;
  booksQuery.rows = rows.books.map((row, index) => index === 0 ? { ...row, content_type: null } : row);
  const fake = createParentQueryFake(queries);

  // When
  const actual = await fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.equal(actual.books.find((book) => book.id === "book-1")!.contentType, "book");
  fake.assertComplete();
});

for (const table of ["children", "assignments", "manual_logs", "books", "completions", "audio_launches"] as const) {
  test(`잘못된 입력/실패: 부모 활동 조회는 ${table} DB error를 빈 활동표로 숨기지 않는다`, async () => {
    // Given
    const queries = successfulQueries();
    const query = queries.find((item) => item.table === table)!;
    query.failure = { error: { message: `${table} denied` } };
    const fake = createParentQueryFake(table === "children" || table === "assignments" || table === "manual_logs" ? queries.slice(0, 3) : queries);

    // When
    const result = fetchParentActivityData(fake.client, owner, range);

    // Then
    await assert.rejects(result, new RegExp(`${table} denied`));
    fake.assertComplete();
  });
}

for (const table of ["assignments", "books"] as const) {
  test(`잘못된 입력/실패: 부모 활동 조회는 ${table} query Promise rejection을 그대로 전파한다`, async () => {
    // Given
    const rejection = new Error(`${table} connection lost`);
    const queries = successfulQueries();
    const query = queries.find((item) => item.table === table)!;
    query.failure = { rejection };
    const fake = createParentQueryFake(table === "assignments" ? queries.slice(0, 3) : queries);

    // When
    const result = fetchParentActivityData(fake.client, owner, range);

    // Then
    await assert.rejects(result, (caught) => caught === rejection);
    fake.assertComplete();
  });
}
