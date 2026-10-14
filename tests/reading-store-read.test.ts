import assert from "node:assert/strict";
import test from "node:test";
import { fetchReadingData, fetchReadingProfileData } from "../lib/supabase/reading-store";

type TableName = "children" | "books" | "assignments" | "completions" | "audio_launches" | "manual_logs";
type Row = Record<string, unknown> & { owner_user_id: string };
type QueryFailure = { error: { message: string } } | { rejection: Error };

const tables: TableName[] = ["children", "books", "assignments", "completions", "audio_launches", "manual_logs"];
const expectedOrder: Partial<Record<TableName, string>> = {
  children: "created_at",
  books: "created_at",
  assignments: "date",
  manual_logs: "date",
};
const expectedSelect: Record<TableName, string> = {
  children: "id, owner_user_id, name, level, goal",
  books: "id, owner_user_id, active, content_type, series, title, volume, level, cover, audio_listen, audio_shadow, note",
  assignments: "id, owner_user_id, child_id, date, book_id, activity_category, tasks, task_counts, quiz_enabled, quiz_score",
  completions: "assignment_id, task_type, completed_at, minutes, audio_opened_at, count",
  audio_launches: "assignment_id, task_type, opened_at, returned_at",
  manual_logs: "id, child_id, date, type, title, minutes, note",
};

function createReadQueryFake(
  initialRows: Partial<Record<TableName, Row[] | null>>,
  failures: Partial<Record<TableName, QueryFailure>> = {},
) {
  const queries: Array<{ table: TableName; ownerUserId: string; order: string | null }> = [];

  function from(table: string) {
    assert.ok(tables.includes(table as TableName), `unsupported table: ${table}`);
    const typedTable = table as TableName;
    let ownerUserId: string | undefined;
    let order: string | null = null;
    let execution: Promise<{ data: Row[] | null; error: { message: string } | null }> | undefined;

    function execute() {
      execution ??= Promise.resolve().then(() => {
        assert.notEqual(ownerUserId, undefined, `${typedTable} must filter owner_user_id`);
        assert.equal(order, expectedOrder[typedTable] ?? null, `${typedTable} must use its required ordering`);
        queries.push({ table: typedTable, ownerUserId: ownerUserId!, order });

        const failure = failures[typedTable];
        if (failure && "rejection" in failure) throw failure.rejection;
        if (failure && "error" in failure) return { data: null, error: failure.error };

        const rows = initialRows[typedTable];
        if (rows === null) return { data: null, error: null };
        const scopedRows = (rows ?? []).filter((row) => row.owner_user_id === ownerUserId);
        const orderColumn = order;
        if (!orderColumn) return { data: structuredClone(scopedRows), error: null };
        return {
          data: structuredClone(scopedRows).sort((left, right) => String(left[orderColumn]).localeCompare(String(right[orderColumn]))),
          error: null,
        };
      });
      return execution;
    }

    const query = {
      select(columns: string) {
        assert.equal(columns, expectedSelect[typedTable], `${typedTable} must select every mapped snake_case column`);
        return query;
      },
      eq(column: string, value: unknown) {
        assert.equal(column, "owner_user_id", `${typedTable} may only filter the owner in this read band`);
        assert.equal(typeof value, "string");
        assert.equal(ownerUserId, undefined, `${typedTable} must have one owner filter`);
        ownerUserId = value as string;
        return query;
      },
      order(column: string, options: { ascending: boolean }) {
        assert.equal(options.ascending, true);
        order = column;
        return query;
      },
      then(resolve: (result: { data: Row[] | null; error: { message: string } | null }) => unknown, reject?: (error: unknown) => unknown) {
        return execute().then(resolve, reject);
      },
    };
    return query;
  }

  return {
    client: { from } as unknown as Parameters<typeof fetchReadingData>[0],
    queries,
  };
}

const owner = "owner-1";
const otherOwner = "owner-2";

const readRows: Record<TableName, Row[]> = {
  children: [
    { id: "child-later", owner_user_id: owner, name: "나중", level: "2", goal: "목표 2", created_at: "2026-10-02" },
    { id: "child-first", owner_user_id: owner, name: "처음", level: "1", goal: "목표 1", created_at: "2026-10-01" },
    { id: "other-child", owner_user_id: otherOwner, name: "다른", level: "9", goal: "다른 목표", created_at: "2026-01-01" },
  ],
  books: [
    {
      id: "book-later", owner_user_id: owner, active: false, content_type: "wordReading", series: "단어", title: "나중 책",
      volume: "2", level: "B", cover: "/later.jpg", audio_listen: "https://audio.example/later", audio_shadow: "", note: "메모 2", created_at: "2026-10-02",
    },
    {
      id: "book-first", owner_user_id: owner, active: true, content_type: null, series: "그림", title: "처음 책",
      volume: "1", level: "A", cover: "/first.jpg", audio_listen: "https://audio.example/first", audio_shadow: "https://audio.example/shadow", note: "메모 1", created_at: "2026-10-01",
    },
    { id: "other-book", owner_user_id: otherOwner, active: true, content_type: "book", series: "다른", title: "다른 책", volume: "", level: "", cover: "", audio_listen: "", audio_shadow: "", note: "", created_at: "2026-01-01" },
  ],
  assignments: [
    {
      id: "assignment-later", owner_user_id: owner, child_id: "child-later", date: "2026-10-15", book_id: "book-later",
      activity_category: "extraStudy", tasks: ["wordRead"], task_counts: { wordRead: 2 }, quiz_enabled: true, quiz_score: "FAIL",
    },
    {
      id: "assignment-first", owner_user_id: owner, child_id: "child-first", date: "2026-10-14", book_id: "book-first",
      activity_category: "focusListen", tasks: ["listen", "listen", "shadow"], task_counts: null, quiz_enabled: null, quiz_score: "PASS",
    },
    { id: "other-assignment", owner_user_id: otherOwner, child_id: "other-child", date: "2026-01-01", book_id: "other-book", activity_category: "focusListen", tasks: ["listen"], task_counts: {}, quiz_enabled: false, quiz_score: null },
  ],
  completions: [
    { owner_user_id: owner, assignment_id: "assignment-first", task_type: "listen", completed_at: "2026-10-14T01:10:00.000Z", minutes: 10, audio_opened_at: null, count: 2 },
    { owner_user_id: otherOwner, assignment_id: "other-assignment", task_type: "listen", completed_at: "2026-01-01T01:10:00.000Z", minutes: 1, audio_opened_at: null, count: 1 },
  ],
  audio_launches: [
    { owner_user_id: owner, assignment_id: "assignment-later", task_type: "wordRead", opened_at: "2026-10-15T01:00:00.000Z", returned_at: "2026-10-15T01:05:00.000Z" },
    { owner_user_id: otherOwner, assignment_id: "other-assignment", task_type: "listen", opened_at: "2026-01-01T01:00:00.000Z", returned_at: null },
  ],
  manual_logs: [
    { id: "log-later", owner_user_id: owner, child_id: "child-later", date: "2026-10-15", type: "englishPicture", title: "나중 기록", minutes: 20, note: "메모 2" },
    { id: "log-first", owner_user_id: owner, child_id: "child-first", date: "2026-10-14", type: "dvd", title: "처음 기록", minutes: 10, note: "메모 1" },
    { id: "other-log", owner_user_id: otherOwner, child_id: "other-child", date: "2026-01-01", type: "korean", title: "다른 기록", minutes: 1, note: "" },
  ],
};

test("정상 입력: 전체 조회는 여섯 컬렉션을 snake_case row에서 owner 범위의 도메인 데이터로 매핑한다", async () => {
  // Given
  const fake = createReadQueryFake(readRows);

  // When
  const actual = await fetchReadingData(fake.client, owner);

  // Then
  assert.deepEqual(actual, {
    children: [
      { id: "child-first", name: "처음", level: "1", goal: "목표 1" },
      { id: "child-later", name: "나중", level: "2", goal: "목표 2" },
    ],
    books: [
      { id: "book-first", active: true, contentType: "book", series: "그림", title: "처음 책", volume: "1", level: "A", cover: "/first.jpg", audio: { listen: "https://audio.example/first", shadow: "https://audio.example/shadow" }, note: "메모 1" },
      { id: "book-later", active: false, contentType: "wordReading", series: "단어", title: "나중 책", volume: "2", level: "B", cover: "/later.jpg", audio: { listen: "https://audio.example/later", shadow: "" }, note: "메모 2" },
    ],
    assignments: [
      { id: "assignment-first", childId: "child-first", date: "2026-10-14", bookId: "book-first", activityCategory: "focusListen", tasks: ["listen", "shadow"], taskCounts: {}, quizEnabled: false, quizScore: "PASS" },
      { id: "assignment-later", childId: "child-later", date: "2026-10-15", bookId: "book-later", activityCategory: "extraStudy", tasks: ["wordRead"], taskCounts: { wordRead: 2 }, quizEnabled: true, quizScore: "FAIL" },
    ],
    completions: { "assignment-first:listen": { completedAt: "2026-10-14T01:10:00.000Z", minutes: 10, audioOpenedAt: null, count: 2 } },
    audioLaunches: { "assignment-later:wordRead": { openedAt: "2026-10-15T01:00:00.000Z", returnedAt: "2026-10-15T01:05:00.000Z" } },
    manualLogs: [
      { id: "log-first", childId: "child-first", date: "2026-10-14", type: "dvd", title: "처음 기록", minutes: 10, note: "메모 1", count: 1 },
      { id: "log-later", childId: "child-later", date: "2026-10-15", type: "englishPicture", title: "나중 기록", minutes: 20, note: "메모 2", count: 1 },
    ],
  });
  assert.deepEqual(fake.queries, tables.map((table) => ({ table, ownerUserId: owner, order: expectedOrder[table] ?? null })));
});

test("경계값: 전체 조회는 모든 data null을 빈 컬렉션과 record로 반환한다", async () => {
  // Given
  const fake = createReadQueryFake({ children: null, books: null, assignments: null, completions: null, audio_launches: null, manual_logs: null });

  // When
  const actual = await fetchReadingData(fake.client, owner);

  // Then
  assert.deepEqual(actual, { children: [], books: [], assignments: [], completions: {}, audioLaunches: {}, manualLogs: [] });
});

test("경계값: 전체 조회는 모든 빈 row 목록을 빈 컬렉션과 record로 반환한다", async () => {
  // Given
  const fake = createReadQueryFake({ children: [], books: [], assignments: [], completions: [], audio_launches: [], manual_logs: [] });

  // When
  const actual = await fetchReadingData(fake.client, owner);

  // Then
  assert.deepEqual(actual, { children: [], books: [], assignments: [], completions: {}, audioLaunches: {}, manualLogs: [] });
});

test("정상 입력: 프로필 조회는 owner 아동을 생성일 순서의 도메인 자료로 매핑한다", async () => {
  // Given
  const fake = createReadQueryFake({ children: readRows.children });

  // When
  const actual = await fetchReadingProfileData(fake.client, owner);

  // Then
  assert.deepEqual(actual, { children: [
    { id: "child-first", name: "처음", level: "1", goal: "목표 1" },
    { id: "child-later", name: "나중", level: "2", goal: "목표 2" },
  ] });
  assert.deepEqual(fake.queries, [{ table: "children", ownerUserId: owner, order: "created_at" }]);
});

test("경계값: 전체 조회는 owner 배정의 null quiz_score를 null로 매핑한다", async () => {
  // Given
  const fake = createReadQueryFake({
    ...readRows,
    assignments: [{ ...readRows.assignments[0], quiz_score: null }],
  });

  // When
  const actual = await fetchReadingData(fake.client, owner);

  // Then
  assert.equal(actual.assignments[0].quizScore, null);
});

test("잘못된 입력: 전체 조회는 owner 배정의 유효하지 않은 quiz_score를 null로 정규화한다", async () => {
  // Given
  const fake = createReadQueryFake({
    ...readRows,
    assignments: [{ ...readRows.assignments[0], quiz_score: "UNKNOWN" }],
  });

  // When
  const actual = await fetchReadingData(fake.client, owner);

  // Then
  assert.equal(actual.assignments[0].quizScore, null);
});

test("경계값: 전체 조회는 owner 오디오 실행의 null returned_at을 null로 매핑한다", async () => {
  // Given
  const fake = createReadQueryFake({
    ...readRows,
    audio_launches: [{ ...readRows.audio_launches[0], returned_at: null }],
  });

  // When
  const actual = await fetchReadingData(fake.client, owner);

  // Then
  assert.equal(actual.audioLaunches["assignment-later:wordRead"].returnedAt, null);
});

test("경계값: 프로필 조회는 data null을 빈 children으로 반환한다", async () => {
  // Given
  const fake = createReadQueryFake({ children: null });

  // When
  const actual = await fetchReadingProfileData(fake.client, owner);

  // Then
  assert.deepEqual(actual, { children: [] });
});

test("경계값: 프로필 조회는 빈 row 목록을 빈 children으로 반환한다", async () => {
  // Given
  const fake = createReadQueryFake({ children: [] });

  // When
  const actual = await fetchReadingProfileData(fake.client, owner);

  // Then
  assert.deepEqual(actual, { children: [] });
});

for (const table of tables) {
  test(`잘못된 입력/실패: 전체 조회는 ${table} DB error를 빈 전체 데이터로 숨기지 않는다`, async () => {
    // Given
    const fake = createReadQueryFake(readRows, { [table]: { error: { message: `${table} denied` } } });

    // When
    const result = fetchReadingData(fake.client, owner);

    // Then
    await assert.rejects(result, new RegExp(`${table} denied`));
  });
}

test("잘못된 입력/실패: 프로필 조회는 children DB error를 빈 프로필로 숨기지 않는다", async () => {
  // Given
  const fake = createReadQueryFake(readRows, { children: { error: { message: "children denied" } } });

  // When
  const result = fetchReadingProfileData(fake.client, owner);

  // Then
  await assert.rejects(result, /children denied/);
});

test("잘못된 입력/실패: 전체 조회는 query Promise rejection을 그대로 전파한다", async () => {
  // Given
  const rejection = new Error("connection lost");
  const fake = createReadQueryFake(readRows, { completions: { rejection } });

  // When
  const result = fetchReadingData(fake.client, owner);

  // Then
  await assert.rejects(result, (caught) => caught === rejection);
});

test("잘못된 입력/실패: 프로필 조회는 query Promise rejection을 그대로 전파한다", async () => {
  // Given
  const rejection = new Error("profile connection lost");
  const fake = createReadQueryFake(readRows, { children: { rejection } });

  // When
  const result = fetchReadingProfileData(fake.client, owner);

  // Then
  await assert.rejects(result, (caught) => caught === rejection);
});
