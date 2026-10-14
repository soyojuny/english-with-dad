import assert from "node:assert/strict";
import test from "node:test";
import { fetchChildTodayData, fetchUpcomingAssignmentData } from "../lib/supabase/reading-store";

type AssignmentRow = Record<string, unknown> & { owner_user_id: string; child_id: string; date: string };
type Filter = { operator: "eq" | "gte"; column: string; value: unknown };
type QueryFailure = { error: { message: string } } | { rejection: Error };

const bookColumns = "id, owner_user_id, active, content_type, series, title, volume, level, cover, audio_listen, audio_shadow, note";
const expectedSelect = {
  today: `id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score, book:books!assignments_book_owner_fkey(${bookColumns}), completions:completions!completions_assignment_owner_fkey(assignment_id, task_type, completed_at, minutes, audio_opened_at, count), audioLaunches:audio_launches!audio_launches_assignment_owner_fkey(assignment_id, task_type, opened_at, returned_at)`,
  upcoming: `id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score, book:books!assignments_book_owner_fkey(${bookColumns})`,
};

function normalizeSelect(columns: string) { return columns.replace(/\s+/g, " ").trim(); }

function createChildAssignmentQueryFake(mode: "today" | "upcoming", initialRows: AssignmentRow[] | null, failure?: QueryFailure) {
  const expectedFilters: Filter[] = mode === "today"
    ? [{ operator: "eq", column: "owner_user_id", value: "owner-1" }, { operator: "eq", column: "child_id", value: "child-1" }, { operator: "eq", column: "date", value: "2026-10-14" }]
    : [{ operator: "eq", column: "owner_user_id", value: "owner-1" }, { operator: "eq", column: "child_id", value: "child-1" }, { operator: "gte", column: "date", value: "2026-10-14" }];
  const filters: Filter[] = [];
  let orderedBy: string | undefined;
  let execution: Promise<{ data: AssignmentRow[] | null; error: { message: string } | null }> | undefined;

  function execute() {
    execution ??= Promise.resolve().then(() => {
      assert.deepEqual(filters, expectedFilters, `${mode} 조회는 owner·child·날짜의 연산자와 값을 모두 필터해야 한다`);
      assert.equal(orderedBy, "date", `${mode} 조회는 날짜 오름차순으로 정렬해야 한다`);
      if (failure && "rejection" in failure) throw failure.rejection;
      if (failure && "error" in failure) return { data: null, error: failure.error };
      if (initialRows === null) return { data: null, error: null };
      const [owner, child, date] = filters;
      const rows = initialRows.filter((row) => row.owner_user_id === owner.value && row.child_id === child.value && (date.operator === "eq" ? row.date === date.value : row.date >= String(date.value)));
      return { data: structuredClone(rows).sort((left, right) => left.date.localeCompare(right.date)), error: null };
    });
    return execution;
  }

  const query = {
    select(columns: string) { assert.equal(normalizeSelect(columns), expectedSelect[mode], `${mode} 조회는 모든 매핑 column과 embedded 관계를 select해야 한다`); return query; },
    eq(column: string, value: unknown) { filters.push({ operator: "eq", column, value }); return query; },
    gte(column: string, value: unknown) { filters.push({ operator: "gte", column, value }); return query; },
    order(column: string, options: { ascending: boolean }) { assert.deepEqual(options, { ascending: true }); assert.equal(orderedBy, undefined, `${mode} 조회는 날짜 정렬을 한 번만 지정해야 한다`); orderedBy = column; return query; },
    then(resolve: (result: { data: AssignmentRow[] | null; error: { message: string } | null }) => unknown, reject?: (error: unknown) => unknown) { return execute().then(resolve, reject); },
  };
  return { client: { from(table: string) { assert.equal(table, "assignments", "아동 배정 조회는 assignments만 읽어야 한다"); return query; } } as unknown as Parameters<typeof fetchChildTodayData>[0] };
}

const book = { id: "book-1", owner_user_id: "owner-1", active: true, content_type: "book", series: "그림", title: "오늘 책", volume: "1", level: "A", cover: "/today.jpg", audio_listen: "https://audio.example/listen", audio_shadow: "https://audio.example/shadow", note: "메모" };
const upcomingBook = { ...book, id: "book-2", title: "예정 책" };
function assignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return { id: "assignment-1", owner_user_id: "owner-1", child_id: "child-1", date: "2026-10-14", book_id: "book-1", activity_category: "focusListen", tasks: ["listen"], task_counts: { listen: 2 }, quiz_enabled: true, quiz_score: "PASS", ...overrides };
}

test("정상 입력: 오늘 조회는 embedded 책 객체를 도메인 책으로 매핑한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", [assignment({ book })]);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.books, [{ id: "book-1", active: true, contentType: "book", series: "그림", title: "오늘 책", volume: "1", level: "A", cover: "/today.jpg", audio: { listen: "https://audio.example/listen", shadow: "https://audio.example/shadow" }, note: "메모" }]);
});

test("경계값: 오늘 조회는 embedded 책 배열의 첫 항목을 사용한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", [assignment({ book: [book, { ...book, id: "book-ignored" }] })]);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.books.map((item) => item.id), ["book-1"]);
});

test("경계값: 오늘 조회는 null embedded 책을 결과에서 제외한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", [assignment({ book: null })]);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.books, []);
});

test("경계값: 오늘 조회는 null embedded completions를 빈 record로 처리한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", [assignment({ completions: null })]);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.completions, {});
});

test("경계값: 오늘 조회는 null embedded audioLaunches를 빈 record로 처리한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", [assignment({ audioLaunches: null })]);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.audioLaunches, {});
});

test("경계값: 오늘 조회는 빈 row 목록을 빈 결과로 처리한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", []);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual, { books: [], assignments: [], completions: {}, audioLaunches: {} });
});

test("경계값: 오늘 조회는 data null을 빈 결과로 처리한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", null);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual, { books: [], assignments: [], completions: {}, audioLaunches: {} });
});

test("정상 입력: 오늘 조회는 completion과 audioLaunch의 assignment-task 복합 key를 모두 보존한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("today", [
    assignment({ completions: [{ assignment_id: "assignment-1", task_type: "listen", completed_at: "2026-10-14T01:00:00.000Z", minutes: 10, audio_opened_at: null, count: 1 }, { assignment_id: "assignment-1", task_type: "shadow", completed_at: "2026-10-14T01:05:00.000Z", minutes: 10, audio_opened_at: null, count: 2 }], audioLaunches: [{ assignment_id: "assignment-1", task_type: "listen", opened_at: "2026-10-14T00:40:00.000Z", returned_at: null }, { assignment_id: "assignment-1", task_type: "shadow", opened_at: "2026-10-14T00:45:00.000Z", returned_at: "2026-10-14T00:55:00.000Z" }] }),
    assignment({ id: "assignment-2", book_id: "book-2", completions: [{ assignment_id: "assignment-2", task_type: "listen", completed_at: "2026-10-14T02:00:00.000Z", minutes: 5, audio_opened_at: null, count: 1 }], audioLaunches: [{ assignment_id: "assignment-2", task_type: "listen", opened_at: "2026-10-14T01:40:00.000Z", returned_at: null }] }),
  ]);
  // When
  const actual = await fetchChildTodayData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(Object.keys(actual.completions).sort(), ["assignment-1:listen", "assignment-1:shadow", "assignment-2:listen"]);
  assert.deepEqual(Object.keys(actual.audioLaunches).sort(), ["assignment-1:listen", "assignment-1:shadow", "assignment-2:listen"]);
});

test("경계값: 예정 조회는 시작일 배정을 포함한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", [assignment({ id: "start", book })]);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.assignments.map((item) => item.id), ["start"]);
});

test("경계값: 예정 조회는 시작일 이전 배정을 제외한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", [assignment({ id: "past", date: "2026-10-13", book })]);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.assignments, []);
});

test("정상 입력: 예정 조회는 날짜 오름차순으로 배정을 반환한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", [assignment({ id: "later", date: "2026-10-16", book_id: "book-2", book: upcomingBook }), assignment({ id: "first", date: "2026-10-15", book })]);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.assignments.map((item) => item.id), ["first", "later"]);
});

test("정상 입력: 예정 조회는 owner와 child 범위 밖 배정을 제외한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", [assignment({ id: "current", book }), assignment({ id: "other-child", child_id: "child-2", book }), assignment({ id: "other-owner", owner_user_id: "owner-2", book })]);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.assignments.map((item) => item.id), ["current"]);
});

test("경계값: 예정 조회는 반복된 embedded 책을 한 번만 반환하고 배정 bookId를 보존한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", [assignment({ id: "first", book_id: "book-2", book: upcomingBook }), assignment({ id: "repeat", date: "2026-10-15", book_id: "book-2", book: upcomingBook })]);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual.books.map((item) => item.id), ["book-2"]);
  assert.deepEqual(actual.assignments.map((item) => item.bookId), ["book-2", "book-2"]);
});

test("경계값: 예정 조회는 빈 row 목록을 빈 결과로 처리한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", []);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual, { books: [], assignments: [] });
});

test("경계값: 예정 조회는 data null을 빈 결과로 처리한다", async () => {
  // Given
  const fake = createChildAssignmentQueryFake("upcoming", null);
  // When
  const actual = await fetchUpcomingAssignmentData(fake.client, "owner-1", "child-1", "2026-10-14");
  // Then
  assert.deepEqual(actual, { books: [], assignments: [] });
});

for (const [mode, fetch] of [["today", fetchChildTodayData], ["upcoming", fetchUpcomingAssignmentData]] as const) {
  test(`잘못된 입력/실패: ${mode === "today" ? "오늘" : "예정"} 조회는 DB error를 빈 결과로 숨기지 않는다`, async () => {
    // Given
    const fake = createChildAssignmentQueryFake(mode, [], { error: { message: `${mode} denied` } });
    // When
    const result = fetch(fake.client, "owner-1", "child-1", "2026-10-14");
    // Then
    await assert.rejects(result, new RegExp(`${mode} denied`));
  });
  test(`잘못된 입력/실패: ${mode === "today" ? "오늘" : "예정"} 조회는 query Promise rejection을 그대로 전파한다`, async () => {
    // Given
    const rejection = new Error(`${mode} connection lost`);
    const fake = createChildAssignmentQueryFake(mode, [], { rejection });
    // When
    const result = fetch(fake.client, "owner-1", "child-1", "2026-10-14");
    // Then
    await assert.rejects(result, (caught) => caught === rejection);
  });
}
