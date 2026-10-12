import assert from "node:assert/strict";
import type { TaskType } from "../../lib/reading-types";
import type { saveCompletion } from "../../lib/supabase/reading-store";

export type CompletionRow = {
  owner_user_id: string;
  assignment_id: string;
  task_type: TaskType;
  completed_at: string;
  minutes: number;
  audio_opened_at: string | null;
  count: number;
};

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

type Response = { data: Record<string, unknown> | null; error: { message: string; code: string } | null };
type MutationPlan = {
  before?: Promise<void>;
  after?: Promise<void>;
  error?: { message: string; code: string };
  loseResponse?: boolean;
};

export function completionSupabaseFake(initialRows: CompletionRow[] = []) {
  const rows = structuredClone(initialRows);
  const writes: { operation: string; values: Partial<CompletionRow> }[] = [];
  const reads: { column: keyof CompletionRow; value: unknown }[][] = [];
  const mutationPlans: MutationPlan[] = [];
  const readPlans: { before?: Promise<void>; error?: { message: string; code: string } }[] = [];

  function from(table: string) {
    assert.equal(table, "completions");
    let operation = "select";
    let values: Partial<CompletionRow> = {};
    let selected: string[] | undefined;
    const filters: { column: keyof CompletionRow; value: unknown }[] = [];
    let execution: Promise<Response> | undefined;

    function execute(optional: boolean) {
      execution ??= (async (): Promise<Response> => {
        const plan = operation === "select" ? readPlans.shift() : mutationPlans.shift();
        if (operation === "select") reads.push([...filters]);
        else writes.push({ operation, values: { ...values } });
        await plan?.before;
        if (plan?.error) return { data: null, error: plan.error };

        let affected = rows.filter((row) => filters.every(({ column, value }) => row[column] === value));
        if (operation === "insert" || operation === "upsert") {
          const existing = rows.find((row) => row.owner_user_id === values.owner_user_id
            && row.assignment_id === values.assignment_id && row.task_type === values.task_type);
          if (existing && operation === "insert") {
            return { data: null, error: { code: "23505", message: "completion key already exists" } };
          }
          if (existing) Object.assign(existing, values);
          else rows.push({ ...values } as CompletionRow);
          affected = [existing ?? rows[rows.length - 1]];
        } else if (operation === "update") {
          for (const row of affected) Object.assign(row, values);
        }

        // Capture the response at commit time, before any newer DB mutation.
        const data = affected.map((row) => selected
          ? Object.fromEntries(selected.map((column) => [column, row[column as keyof CompletionRow]]))
          : { ...row });
        if (plan && "after" in plan) await plan.after;
        if (plan && "loseResponse" in plan && plan.loseResponse) throw new Error("response lost after commit");
        if (data.length === 1) return { data: data[0], error: null };
        if (!data.length && optional) return { data: null, error: null };
        return { data: null, error: { code: "PGRST116", message: "expected exactly one row" } };
      })();
      return execution;
    }

    const query = {
      insert(patch: CompletionRow) { operation = "insert"; values = { ...patch }; return query; },
      upsert(patch: CompletionRow) { operation = "upsert"; values = { ...patch }; return query; },
      update(patch: Partial<CompletionRow>) { operation = "update"; values = { ...patch }; return query; },
      eq(column: keyof CompletionRow, value: unknown) { filters.push({ column, value }); return query; },
      select(columns: string) {
        selected = columns === "*" ? undefined : columns.split(",").map((column) => column.trim());
        return query;
      },
      single() { return execute(false); },
      maybeSingle() { return execute(true); },
    };
    return query;
  }
  return { client: { from } as unknown as Parameters<typeof saveCompletion>[0], rows, writes, reads, mutationPlans, readPlans };
}
