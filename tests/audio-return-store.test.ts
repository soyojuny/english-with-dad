import test from "node:test";
import assert from "node:assert/strict";
import { fetchAudioLaunch, saveAudioLaunch, saveAudioReturn } from "../lib/supabase/reading-store";
import type { TaskType } from "../lib/reading-types";

type LaunchRow = {
  owner_user_id: string;
  assignment_id: string;
  task_type: TaskType;
  opened_at: string;
  returned_at: string | null;
};

type QueryResult = {
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  error: { message: string; code?: string } | null;
};
type AudioQuery = {
  operation: "select" | "update" | "upsert";
  values: Partial<LaunchRow>;
  conflictColumns: (keyof LaunchRow)[];
  selectedColumns: string[] | undefined;
  conditions: { column: keyof LaunchRow; value: unknown }[];
  terminal: "single" | "maybeSingle" | "many";
};

const openedAt = "2026-10-12T01:00:00.000Z";
const returnedAt = "2026-10-12T01:10:00.000Z";
const newerOpenedAt = "2026-10-12T02:00:00.000Z";
const laterReturnedAt = "2026-10-12T02:10:00.000Z";
const initialRow: LaunchRow = {
  owner_user_id: "owner-1",
  assignment_id: "assignment-1",
  task_type: "listen",
  opened_at: openedAt,
  returned_at: null,
};
const returnPayload = {
  assignmentId: initialRow.assignment_id,
  taskType: initialRow.task_type,
  openedAt,
  returnedAt,
};

// Execute filters against mutable rows rather than returning a canned success.
// In particular, an upsert of an old return really overwrites a newer launch here.
function createSupabaseFake(
  initialRows: LaunchRow[],
  failure?: { databaseError: { message: string } } | { rejection: Error } | { dataNull: true },
) {
  const rows = structuredClone(initialRows);
  const writes: {
    operation: "update" | "upsert";
    values: Partial<LaunchRow>;
    onConflict?: string;
  }[] = [];
  const queries: AudioQuery[] = [];

  function from(table: string) {
    assert.equal(table, "audio_launches");
    let operation: "select" | "update" | "upsert" = "select";
    let values: Partial<LaunchRow> = {};
    let conflictColumns: (keyof LaunchRow)[] = [];
    let selectedColumns: string[] | undefined;
    const conditions: { column: keyof LaunchRow; value: unknown }[] = [];
    let execution: Promise<QueryResult> | undefined;

    function execute(cardinality: "many" | "single" | "maybeSingle") {
      execution ??= Promise.resolve().then((): QueryResult => {
        queries.push({
          operation, values: { ...values }, conflictColumns: [...conflictColumns],
          selectedColumns, conditions: [...conditions], terminal: cardinality,
        });
        if (failure && "rejection" in failure) throw failure.rejection;
        if (failure && "databaseError" in failure) {
          return { data: null, error: failure.databaseError };
        }
        if (failure && "dataNull" in failure) return { data: null, error: null };

        let affected: LaunchRow[];
        if (operation === "update") {
          affected = rows.filter((row) => conditions.every(({ column, value }) => row[column] === value));
          for (const row of affected) Object.assign(row, values);
        } else if (operation === "upsert") {
          assert.ok(conflictColumns.length, "fake upsert needs its conflict key");
          const existing = rows.find((row) => conflictColumns.every((column) => row[column] === values[column]));
          if (existing) {
            Object.assign(existing, values);
            affected = [existing];
          } else {
            const inserted = { ...values } as LaunchRow;
            rows.push(inserted);
            affected = [inserted];
          }
        } else {
          affected = rows.filter((row) => conditions.every(({ column, value }) => row[column] === value));
        }

        const data = affected.map((row) => selectedColumns
          ? Object.fromEntries(selectedColumns.map((column) => [column, row[column as keyof LaunchRow]]))
          : { ...row });
        if (cardinality === "many") return { data, error: null };
        if (data.length === 1) return { data: data[0], error: null };
        if (!data.length && cardinality === "maybeSingle") return { data: null, error: null };
        return { data: null, error: { code: "PGRST116", message: "Expected exactly one row" } };
      });
      return execution;
    }

    const query = {
      update(patch: Partial<LaunchRow>) {
        operation = "update";
        values = { ...patch };
        writes.push({ operation, values });
        return query;
      },
      upsert(patch: LaunchRow, options: { onConflict: string }) {
        operation = "upsert";
        values = { ...patch };
        conflictColumns = options.onConflict.split(",").map((column) => column.trim() as keyof LaunchRow);
        writes.push({ operation, values, onConflict: options.onConflict });
        return query;
      },
      eq(column: keyof LaunchRow, value: unknown) {
        conditions.push({ column, value });
        return query;
      },
      is(column: keyof LaunchRow, value: null) {
        conditions.push({ column, value });
        return query;
      },
      select(columns: string) {
        selectedColumns = columns === "*" ? undefined : columns.split(",").map((column) => column.trim());
        return query;
      },
      single() {
        return execute("single");
      },
      maybeSingle() {
        return execute("maybeSingle");
      },
      then(resolve: (result: QueryResult) => unknown, reject?: (error: unknown) => unknown) {
        return execute("many").then(resolve, reject);
      },
    };
    return query;
  }

  return {
    client: { from } as unknown as Parameters<typeof saveAudioLaunch>[0],
    rows,
    writes,
    queries,
  };
}

test("saveAudioReturn updates only returned_at on the matching unreturned launch", async () => {
  const unrelatedRows: LaunchRow[] = [
    { ...initialRow, owner_user_id: "owner-2" },
    { ...initialRow, assignment_id: "assignment-2" },
    { ...initialRow, task_type: "shadow" },
  ];
  const fake = createSupabaseFake([initialRow, ...unrelatedRows]);

  const result = await saveAudioReturn(fake.client, "owner-1", returnPayload);

  assert.deepEqual(result, {
    key: "assignment-1:listen",
    value: { openedAt, returnedAt },
  });
  assert.deepEqual(fake.rows, [{ ...initialRow, returned_at: returnedAt }, ...unrelatedRows]);
  assert.deepEqual(fake.writes, [{ operation: "update", values: { returned_at: returnedAt } }]);
});

test("정상 입력: 오디오 복귀 저장은 미복귀 실행만 정확한 조건과 projection으로 갱신한다", async () => {
  // Given
  const fake = createSupabaseFake([initialRow]);

  // When
  await saveAudioReturn(fake.client, "owner-1", returnPayload);

  // Then
  assert.deepEqual(fake.queries, [{
    operation: "update",
    values: { returned_at: returnedAt },
    conflictColumns: [],
    selectedColumns: ["assignment_id", "task_type", "opened_at", "returned_at"],
    conditions: [
      { column: "owner_user_id", value: "owner-1" },
      { column: "assignment_id", value: "assignment-1" },
      { column: "task_type", value: "listen" },
      { column: "opened_at", value: openedAt },
      { column: "returned_at", value: null },
    ],
    terminal: "maybeSingle",
  }]);
});

for (const [condition, row] of [
  ["owner", { ...initialRow, owner_user_id: "owner-2" }],
  ["assignment", { ...initialRow, assignment_id: "assignment-2" }],
  ["task", { ...initialRow, task_type: "shadow" }],
  ["opened_at", { ...initialRow, opened_at: newerOpenedAt }],
] satisfies [string, LaunchRow][]) {
  test(`saveAudioReturn treats a mismatched ${condition} as a non-error conflict`, async () => {
    const fake = createSupabaseFake([row]);

    assert.equal(await saveAudioReturn(fake.client, "owner-1", returnPayload), null);
    assert.deepEqual(fake.rows, [row]);
  });
}

test("saveAudioReturn does not insert a missing launch", async () => {
  const fake = createSupabaseFake([]);

  assert.equal(await saveAudioReturn(fake.client, "owner-1", returnPayload), null);
  assert.deepEqual(fake.rows, []);
});

test("an old return arriving after saveAudioLaunch preserves the newer DB launch", async () => {
  const fake = createSupabaseFake([initialRow]);
  await saveAudioLaunch(fake.client, "owner-1", {
    ...returnPayload,
    openedAt: newerOpenedAt,
    returnedAt: null,
  });
  const newerRows = structuredClone(fake.rows);

  assert.equal(await saveAudioReturn(fake.client, "owner-1", returnPayload), null);
  assert.deepEqual(fake.rows, newerRows);
  assert.equal(fake.rows[0].opened_at, newerOpenedAt);
  assert.equal(fake.rows[0].returned_at, null);
});

test("saveAudioReturn preserves a previously persisted first return", async () => {
  const row = { ...initialRow, returned_at: returnedAt };
  const fake = createSupabaseFake([row]);

  assert.equal(await saveAudioReturn(fake.client, "owner-1", {
    ...returnPayload,
    returnedAt: laterReturnedAt,
  }), null);
  assert.deepEqual(fake.rows, [row]);
});

test("a duplicate saveAudioReturn keeps the first successful return unchanged", async () => {
  const fake = createSupabaseFake([initialRow]);
  assert.deepEqual(await saveAudioReturn(fake.client, "owner-1", returnPayload), {
    key: "assignment-1:listen",
    value: { openedAt, returnedAt },
  });

  assert.equal(await saveAudioReturn(fake.client, "owner-1", {
    ...returnPayload,
    returnedAt: laterReturnedAt,
  }), null);
  assert.deepEqual(fake.rows, [{ ...initialRow, returned_at: returnedAt }]);
});

test("saveAudioReturn propagates DB errors instead of reporting a conflict", async () => {
  const fake = createSupabaseFake([initialRow], { databaseError: { message: "return write denied" } });

  await assert.rejects(saveAudioReturn(fake.client, "owner-1", returnPayload), /return write denied/);
  assert.deepEqual(fake.rows, [initialRow]);
});

test("saveAudioReturn propagates rejected requests", async () => {
  const error = new Error("network unavailable");
  const fake = createSupabaseFake([initialRow], { rejection: error });

  await assert.rejects(saveAudioReturn(fake.client, "owner-1", returnPayload), (caught) => caught === error);
  assert.deepEqual(fake.rows, [initialRow]);
});

test("saveAudioLaunch retains its existing insert upsert and return mapping", async () => {
  const fake = createSupabaseFake([]);

  assert.deepEqual(await saveAudioLaunch(fake.client, "owner-1", returnPayload), {
    key: "assignment-1:listen",
    value: { openedAt, returnedAt },
  });
  assert.deepEqual(fake.rows, [{ ...initialRow, returned_at: returnedAt }]);
  assert.deepEqual(fake.writes, [{
    operation: "upsert",
    values: { ...initialRow, returned_at: returnedAt },
    onConflict: "owner_user_id,assignment_id,task_type",
  }]);
});

test("정상 입력: 오디오 실행 저장은 충돌 키·projection·single로 실행 기록을 반환한다", async () => {
  // Given
  const fake = createSupabaseFake([]);

  // When
  const result = await saveAudioLaunch(fake.client, "owner-1", returnPayload);

  // Then
  assert.deepEqual(result, { key: "assignment-1:listen", value: { openedAt, returnedAt } });
  assert.deepEqual(fake.queries, [{
    operation: "upsert",
    values: { ...initialRow, returned_at: returnedAt },
    conflictColumns: ["owner_user_id", "assignment_id", "task_type"],
    selectedColumns: ["assignment_id", "task_type", "opened_at", "returned_at"],
    conditions: [],
    terminal: "single",
  }]);
});

test("saveAudioLaunch replaces the old launch and clears its return on the same conflict key", async () => {
  const unrelated = { ...initialRow, owner_user_id: "owner-2" };
  const fake = createSupabaseFake([{ ...initialRow, returned_at: returnedAt }, unrelated]);

  assert.deepEqual(await saveAudioLaunch(fake.client, "owner-1", {
    ...returnPayload,
    openedAt: newerOpenedAt,
    returnedAt: null,
  }), {
    key: "assignment-1:listen",
    value: { openedAt: newerOpenedAt, returnedAt: null },
  });
  assert.deepEqual(fake.rows, [{ ...initialRow, opened_at: newerOpenedAt }, unrelated]);
  assert.deepEqual(fake.writes, [{
    operation: "upsert",
    values: { ...initialRow, opened_at: newerOpenedAt },
    onConflict: "owner_user_id,assignment_id,task_type",
  }]);
});

test("fetchAudioLaunch scopes owner, assignment and task and maps the persisted launch", async () => {
  const fake = createSupabaseFake([
    { ...initialRow, returned_at: returnedAt },
    { ...initialRow, owner_user_id: "owner-2" },
    { ...initialRow, assignment_id: "assignment-2" },
    { ...initialRow, task_type: "shadow" },
  ]);
  assert.deepEqual(await fetchAudioLaunch(fake.client, "owner-1", "assignment-1", "listen"), {
    key: "assignment-1:listen", value: { openedAt, returnedAt },
  });
  assert.deepEqual(fake.writes, []);
});

test("정상 입력: 오디오 실행 조회는 정확한 범위·projection·maybeSingle으로 매핑한다", async () => {
  // Given
  const fake = createSupabaseFake([{ ...initialRow, returned_at: returnedAt }]);

  // When
  const result = await fetchAudioLaunch(fake.client, "owner-1", "assignment-1", "listen");

  // Then
  assert.deepEqual(result, { key: "assignment-1:listen", value: { openedAt, returnedAt } });
  assert.deepEqual(fake.queries, [{
    operation: "select",
    values: {},
    conflictColumns: [],
    selectedColumns: ["assignment_id", "task_type", "opened_at", "returned_at"],
    conditions: [
      { column: "owner_user_id", value: "owner-1" },
      { column: "assignment_id", value: "assignment-1" },
      { column: "task_type", value: "listen" },
    ],
    terminal: "maybeSingle",
  }]);
});

test("fetchAudioLaunch returns null for no scoped row", async () => {
  const fake = createSupabaseFake([{ ...initialRow, owner_user_id: "owner-2" }]);
  assert.equal(await fetchAudioLaunch(fake.client, "owner-1", "assignment-1", "listen"), null);
});

test("fetchAudioLaunch propagates database errors", async () => {
  const fake = createSupabaseFake([], { databaseError: { message: "audio read denied" } });
  await assert.rejects(fetchAudioLaunch(fake.client, "owner-1", "assignment-1", "listen"), /audio read denied/);
});

test("실패: 오디오 실행 저장의 DB 오류를 전파한다", async () => {
  // Given
  const fake = createSupabaseFake([], { databaseError: { message: "launch write denied" } });

  // When
  const actual = saveAudioLaunch(fake.client, "owner-1", returnPayload);

  // Then
  await assert.rejects(actual, /launch write denied/);
});

test("실패: 오디오 실행 저장의 null data는 저장 실패로 거부한다", async () => {
  // Given
  const fake = createSupabaseFake([], { dataNull: true });

  // When
  const actual = saveAudioLaunch(fake.client, "owner-1", returnPayload);

  // Then
  await assert.rejects(actual, /오디오 실행 기록을 저장하지 못했습니다/);
});

test("실패: 오디오 실행 저장의 Promise 거부를 전파한다", async () => {
  // Given
  const rejection = new Error("launch network unavailable");
  const fake = createSupabaseFake([], { rejection });

  // When
  const actual = saveAudioLaunch(fake.client, "owner-1", returnPayload);

  // Then
  await assert.rejects(actual, (error) => error === rejection);
});

test("실패: 오디오 실행 조회의 Promise 거부를 전파한다", async () => {
  // Given
  const rejection = new Error("audio read disconnected");
  const fake = createSupabaseFake([], { rejection });

  // When
  const actual = fetchAudioLaunch(fake.client, "owner-1", "assignment-1", "listen");

  // Then
  await assert.rejects(actual, (error) => error === rejection);
});
