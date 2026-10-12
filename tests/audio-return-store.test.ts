import test from "node:test";
import assert from "node:assert/strict";
import { saveAudioLaunch, saveAudioReturn } from "../lib/supabase/reading-store";
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
  failure?: { databaseError: { message: string } } | { rejection: Error },
) {
  const rows = structuredClone(initialRows);
  const writes: {
    operation: "update" | "upsert";
    values: Partial<LaunchRow>;
    onConflict?: string;
  }[] = [];

  function from(table: string) {
    assert.equal(table, "audio_launches");
    let operation: "update" | "upsert" | undefined;
    let values: Partial<LaunchRow> = {};
    let conflictColumns: (keyof LaunchRow)[] = [];
    let selectedColumns: string[] | undefined;
    const conditions: { column: keyof LaunchRow; value: unknown }[] = [];
    let execution: Promise<QueryResult> | undefined;

    function execute(cardinality: "many" | "single" | "maybeSingle") {
      execution ??= Promise.resolve().then((): QueryResult => {
        if (failure && "rejection" in failure) throw failure.rejection;
        if (failure && "databaseError" in failure) {
          return { data: null, error: failure.databaseError };
        }

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
          throw new Error("Expected update or upsert");
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
