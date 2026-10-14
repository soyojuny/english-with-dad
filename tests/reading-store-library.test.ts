import assert from "node:assert/strict";
import test from "node:test";
import { isDeepStrictEqual } from "node:util";
import {
  fetchAssignedBookIds,
  fetchBookManageData,
  fetchBookSeriesNames,
  fetchLibraryData,
} from "../lib/supabase/reading-store";

type Filter = { column: string; operator: "eq" | "ilike"; value: unknown };
type QueryFailure = { error: { message: string } } | { rejection: Error };
type QueryPlan = {
  table: "books" | "assignments";
  select: string;
  filters: Filter[];
  order?: string;
  rows?: Record<string, unknown>[] | null;
  failure?: QueryFailure;
};

const owner = "owner-1";
const bookColumns = "id, owner_user_id, active, content_type, series, title, volume, level, cover, audio_listen, audio_shadow, note";

function assertFiltersMatch(actual: Filter[], expected: Filter[], table: string) {
  const unmatched = [...expected];
  for (const filter of actual) {
    const index = unmatched.findIndex((candidate) => isDeepStrictEqual(candidate, filter));
    assert.notEqual(index, -1, `${table} 조회는 예상하지 않은 filter를 사용하면 안 된다`);
    unmatched.splice(index, 1);
  }
  assert.equal(unmatched.length, 0, `${table} 조회는 예상 filter를 빠뜨리면 안 된다`);
}

function createQueryFake(plans: QueryPlan[]) {
  const expectedByTable = new Map(plans.map((plan) => [plan.table, plan]));
  assert.equal(expectedByTable.size, plans.length, "대역의 예상 table은 중복될 수 없다");
  const startedTables = new Set<string>();
  const executedTables = new Set<string>();

  function from(table: string) {
    const expectedPlan = expectedByTable.get(table as QueryPlan["table"]);
    if (!expectedPlan) throw new Error(`불필요한 ${table} 조회는 허용하지 않는다`);
    const plan: QueryPlan = expectedPlan;
    assert.ok(!startedTables.has(table), `${table} 조회는 한 번만 허용한다`);
    startedTables.add(table);
    const filters: Filter[] = [];
    let selectedColumns: string | undefined;
    let orderedBy: string | undefined;
    let execution: Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> | undefined;

    function execute() {
      execution ??= Promise.resolve().then(() => {
        executedTables.add(table);
        assert.equal(selectedColumns, plan.select, `${table} 조회는 정확한 select projection을 사용해야 한다`);
        assertFiltersMatch(filters, plan.filters, table);
        assert.equal(orderedBy, plan.order, `${table} 조회는 필요한 정렬만 사용해야 한다`);
        if (plan.failure && "rejection" in plan.failure) throw plan.failure.rejection;
        if (plan.failure && "error" in plan.failure) return { data: null, error: plan.failure.error };
        return { data: plan.rows === undefined ? [] : structuredClone(plan.rows), error: null };
      });
      return execution;
    }

    const query = {
      select(columns: string) { assert.equal(selectedColumns, undefined, `${table} select는 한 번만 호출해야 한다`); selectedColumns = columns; return query; },
      eq(column: string, value: unknown) { filters.push({ operator: "eq", column, value }); return query; },
      ilike(column: string, value: unknown) { filters.push({ operator: "ilike", column, value }); return query; },
      order(column: string, options: { ascending: boolean }) { assert.deepEqual(options, { ascending: true }); assert.equal(orderedBy, undefined, `${table} order는 한 번만 호출해야 한다`); orderedBy = column; return query; },
      then(resolve: (result: { data: Record<string, unknown>[] | null; error: { message: string } | null }) => unknown, reject?: (error: unknown) => unknown) { return execute().then(resolve, reject); },
    };
    return query;
  }

  return {
    client: { from } as unknown as Parameters<typeof fetchBookManageData>[0],
    assertComplete() {
      const expectedTables = new Set(expectedByTable.keys());
      assert.deepEqual(startedTables, expectedTables, "예정된 조회를 시작하지 않으면 안 된다");
      assert.deepEqual(executedTables, expectedTables, "시작한 조회를 실행하지 않으면 안 된다");
    },
  };
}

function createSeriesFake(rpc: { data: Record<string, unknown>[] | null; error: { message: string } | null } | { rejection: Error }, fallback?: QueryPlan) {
  const queryFake = fallback ? createQueryFake([fallback]) : undefined;
  let rpcCalls = 0;
  return {
    client: {
      rpc(name: string, args: unknown) {
        assert.equal(name, "book_series_names", "시리즈 조회는 전용 RPC를 사용해야 한다");
        assert.deepEqual(args, { target_owner_user_id: owner }, "시리즈 RPC는 owner를 인자로 전달해야 한다");
        rpcCalls += 1;
        if ("rejection" in rpc) return Promise.reject(rpc.rejection);
        return Promise.resolve(rpc);
      },
      from(table: string) {
        if (!queryFake) throw new Error(`RPC 성공 후 ${table} fallback 조회는 허용하지 않는다`);
        return (queryFake.client as unknown as { from(table: string): unknown }).from(table);
      },
    } as unknown as Parameters<typeof fetchBookSeriesNames>[0],
    assertComplete() { assert.equal(rpcCalls, 1, "RPC는 한 번만 호출해야 한다"); queryFake?.assertComplete(); },
  };
}

const books = [
  { id: "book-1", owner_user_id: owner, active: true, content_type: "book", series: "그림", title: "첫 책", volume: "1", level: "A", cover: "/first.jpg", audio_listen: "listen", audio_shadow: "shadow", note: "" },
  { id: "book-2", owner_user_id: owner, active: false, content_type: "wordReading", series: "단어", title: "둘째 책", volume: "2", level: "B", cover: "/second.jpg", audio_listen: "word", audio_shadow: "", note: "" },
];

test("정상 입력: 자료 관리 조회는 선택한 시리즈의 자료를 생성일 순서로 매핑한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }, { operator: "eq", column: "series", value: "그림" }], order: "created_at", rows: [books[0]] }]);

  // When
  const actual = await fetchBookManageData(fake.client, owner, { series: "그림" });

  // Then
  assert.deepEqual(actual.books, [{ id: "book-1", active: true, contentType: "book", series: "그림", title: "첫 책", volume: "1", level: "A", cover: "/first.jpg", audio: { listen: "listen", shadow: "shadow" }, note: "" }]);
  fake.assertComplete();
});

test("경계값: 자료 관리 조회는 all 시리즈를 필터하지 않고 비활성 자료도 반환한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }], order: "created_at", rows: books }]);

  // When
  const actual = await fetchBookManageData(fake.client, owner, { series: "all" });

  // Then
  assert.deepEqual(actual.books.map((book) => [book.id, book.active, book.contentType]), [["book-1", true, "book"], ["book-2", false, "wordReading"]]);
  fake.assertComplete();
});

test("경계값: 자료 관리 제목 검색은 퍼센트와 밑줄을 이스케이프하지 않고 ilike 패턴으로 전달한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }, { operator: "ilike", column: "title", value: "%100%_완료%" }], order: "created_at" }]);

  // When
  await fetchBookManageData(fake.client, owner, { title: "100%_완료" });

  // Then
  fake.assertComplete();
});

test("잘못된 입력/실패: 자료 관리 조회는 DB error를 빈 자료 목록으로 숨기지 않는다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }], order: "created_at", failure: { error: { message: "manage denied" } } }]);

  // When
  const result = fetchBookManageData(fake.client, owner);

  // Then
  await assert.rejects(result, /manage denied/);
  fake.assertComplete();
});

test("경계값: 자료 관리 조회는 data null을 빈 자료 목록으로 처리한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }], order: "created_at", rows: null }]);

  // When
  const actual = await fetchBookManageData(fake.client, owner);

  // Then
  assert.deepEqual(actual.books, []);
  fake.assertComplete();
});

test("정상 입력: 시리즈 RPC 결과는 공백을 제거하고 빈 값과 중복을 제외해 정렬한다", async () => {
  // Given
  const fake = createSeriesFake({ data: [{ series: " Zebra " }, { series: "" }, { series: null }, { series: "Apple" }, { series: "Zebra" }], error: null });

  // When
  const actual = await fetchBookSeriesNames(fake.client, owner);

  // Then
  assert.deepEqual(actual, ["Apple", "Zebra"]);
  fake.assertComplete();
});

test("경계값: 시리즈 RPC error면 owner 범위 시리즈 fallback 조회 결과를 정리한다", async () => {
  // Given
  const fake = createSeriesFake({ data: null, error: { message: "rpc unavailable" } }, { table: "books", select: "series", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], order: "series", rows: [{ series: " Beta " }, { series: "Alpha" }, { series: "Beta" }, { series: " " }] });

  // When
  const actual = await fetchBookSeriesNames(fake.client, owner);

  // Then
  assert.deepEqual(actual, ["Alpha", "Beta"]);
  fake.assertComplete();
});

test("경계값: 시리즈 RPC가 data null과 error null을 반환하면 fallback 없이 빈 목록을 반환한다", async () => {
  // Given
  const fake = createSeriesFake({ data: null, error: null });

  // When
  const actual = await fetchBookSeriesNames(fake.client, owner);

  // Then
  assert.deepEqual(actual, []);
  fake.assertComplete();
});

test("잘못된 입력/실패: 시리즈 RPC fallback 조회 error를 숨기지 않는다", async () => {
  // Given
  const fake = createSeriesFake({ data: null, error: { message: "rpc denied" } }, { table: "books", select: "series", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], order: "series", failure: { error: { message: "fallback denied" } } });

  // When
  const result = fetchBookSeriesNames(fake.client, owner);

  // Then
  await assert.rejects(result, /fallback denied/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 시리즈 RPC response error 뒤 fallback query Promise rejection을 같은 객체로 전파한다", async () => {
  // Given
  const rejection = new Error("fallback connection lost");
  const fake = createSeriesFake({ data: null, error: { message: "rpc denied" } }, { table: "books", select: "series", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], order: "series", failure: { rejection } });

  // When
  const result = fetchBookSeriesNames(fake.client, owner);

  // Then
  await assert.rejects(result, (caught) => caught === rejection);
  fake.assertComplete();
});

test("잘못된 입력/실패: 시리즈 RPC Promise rejection은 fallback으로 바꾸지 않고 그대로 전파한다", async () => {
  // Given
  const rejection = new Error("rpc connection lost");
  const fake = createSeriesFake({ rejection });

  // When
  const result = fetchBookSeriesNames(fake.client, owner);

  // Then
  await assert.rejects(result, (caught) => caught === rejection);
  fake.assertComplete();
});

test("정상 입력: library 조회는 owner의 활성 자료만 생성일 순서로 매핑한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }, { operator: "eq", column: "active", value: true }], order: "created_at", rows: [books[0]] }]);

  // When
  const actual = await fetchLibraryData(fake.client, owner);

  // Then
  assert.deepEqual(actual.books.map((book) => book.id), ["book-1"]);
  fake.assertComplete();
});

test("경계값: library 조회는 빈 row 목록을 빈 자료 목록으로 처리한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }, { operator: "eq", column: "active", value: true }], order: "created_at", rows: [] }]);

  // When
  const actual = await fetchLibraryData(fake.client, owner);

  // Then
  assert.deepEqual(actual.books, []);
  fake.assertComplete();
});

test("잘못된 입력/실패: library 조회는 query Promise rejection을 그대로 전파한다", async () => {
  // Given
  const rejection = new Error("library connection lost");
  const fake = createQueryFake([{ table: "books", select: bookColumns, filters: [{ operator: "eq", column: "owner_user_id", value: owner }, { operator: "eq", column: "active", value: true }], order: "created_at", failure: { rejection } }]);

  // When
  const result = fetchLibraryData(fake.client, owner);

  // Then
  await assert.rejects(result, (caught) => caught === rejection);
  fake.assertComplete();
});

test("정상 입력: 배정 이력 조회는 owner 전체 이력의 중복 book ID를 첫 순서대로 한 번만 반환한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "assignments", select: "book_id", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], rows: [{ book_id: "book-2" }, { book_id: "book-1" }, { book_id: "book-2" }] }]);

  // When
  const actual = await fetchAssignedBookIds(fake.client, owner);

  // Then
  assert.deepEqual(actual, ["book-2", "book-1"]);
  fake.assertComplete();
});

test("경계값: 배정 이력 조회는 data null을 빈 목록으로 처리한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "assignments", select: "book_id", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], rows: null }]);

  // When
  const actual = await fetchAssignedBookIds(fake.client, owner);

  // Then
  assert.deepEqual(actual, []);
  fake.assertComplete();
});

test("경계값: 배정 이력 조회는 빈 book ID를 제외한다", async () => {
  // Given
  const fake = createQueryFake([{ table: "assignments", select: "book_id", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], rows: [{ book_id: "" }] }]);

  // When
  const actual = await fetchAssignedBookIds(fake.client, owner);

  // Then
  assert.deepEqual(actual, []);
  fake.assertComplete();
});

test("잘못된 입력/실패: 배정 이력 조회는 DB error를 빈 목록으로 숨기지 않는다", async () => {
  // Given
  const fake = createQueryFake([{ table: "assignments", select: "book_id", filters: [{ operator: "eq", column: "owner_user_id", value: owner }], failure: { error: { message: "history denied" } } }]);

  // When
  const result = fetchAssignedBookIds(fake.client, owner);

  // Then
  await assert.rejects(result, /history denied/);
  fake.assertComplete();
});
