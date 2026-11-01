import assert from "node:assert/strict";
import test from "node:test";
import { getPeriodDateRange, shiftSelectedDateKey } from "../lib/reading-period";
import * as store from "../lib/supabase/reading-store";
import type { Dvd } from "../lib/reading-types";

type Client = Parameters<typeof store.fetchDvdCatalogData>[0];
type DvdWrites = {
  addDvd(client: Client, owner: string, title: string): Promise<Dvd>;
  setDvdActive(client: Client, owner: string, id: string, active: boolean): Promise<Dvd>;
};
const writes = store as unknown as DvdWrites;
const owner = "owner-1";
type Row = Record<string, unknown>;

function createFake(initialDvds: Row[] = [], initialLogs: Row[] = []) {
  const tables: Record<string, Row[]> = {
    dvds: structuredClone(initialDvds), manual_logs: structuredClone(initialLogs), children: [], assignments: [],
  };
  let mutations = 0;
  const client = {
    from(table: string) {
      assert.ok(table in tables, `예상하지 않은 ${table} 접근`);
      let operation = "read";
      let payload: Row = {};
      const filters: Array<(row: Row) => boolean> = [];
      const query = {
        select(_columns: string) { return query; },
        insert(value: Row) { operation = "insert"; payload = value; return query; },
        update(value: Row) { operation = "update"; payload = value; return query; },
        eq(column: string, value: unknown) { filters.push((row) => row[column] === value); return query; },
        gte(column: string, value: string) { filters.push((row) => String(row[column]) >= value); return query; },
        lte(column: string, value: string) { filters.push((row) => String(row[column]) <= value); return query; },
        order(_column: string, _options: unknown) { return query; },
        async single() {
          mutations += 1;
          assert.equal(table, "dvds");
          if (operation === "insert") {
            const row = { id: "dvd-new", ...payload };
            tables.dvds.push(row);
            return { data: structuredClone(row), error: null };
          }
          assert.equal(operation, "update");
          const row = tables.dvds.find((item) => filters.every((filter) => filter(item)));
          assert.ok(row);
          Object.assign(row, payload);
          return { data: structuredClone(row), error: null };
        },
        then(resolve: (result: { data: Row[]; error: null }) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve().then(() => ({ data: structuredClone(tables[table].filter((row) => filters.every((filter) => filter(row)))), error: null })).then(resolve, reject);
        },
      };
      return query;
    },
  } as unknown as Client;
  return { client, mutationCount: () => mutations };
}

test("정상 입력: 새 DVD는 제목 양끝 공백을 제거하고 활성 상태로 저장한다", async () => {
  // Given
  const fake = createFake();

  // When
  const added = await writes.addDvd(fake.client, owner, "  첫 DVD  ");
  const catalog = await store.fetchDvdCatalogData(fake.client, owner);

  // Then
  assert.deepEqual(added, { id: "dvd-new", title: "첫 DVD", active: true });
  assert.deepEqual(catalog.dvds, [added]);
});

for (const title of ["", " \t  "]) {
  test(`잘못된 입력: ${JSON.stringify(title)} 제목은 거부하고 저장하지 않는다`, async () => {
    // Given
    const fake = createFake();

    // When
    assert.equal(typeof writes.addDvd, "function", "DVD 추가 함수가 필요하다");
    const result = Promise.resolve().then(() => writes.addDvd(fake.client, owner, title));

    // Then
    await assert.rejects(result);
    assert.equal(fake.mutationCount(), 0);
    assert.deepEqual((await store.fetchDvdCatalogData(fake.client, owner)).dvds, []);
  });
}

test("정상 입력: DVD를 비활성화한 뒤 다시 활성화해도 기존 시청 기록이 보존된다", async () => {
  // Given
  const fake = createFake(
    [{ id: "dvd-1", owner_user_id: owner, title: "첫 DVD", active: true }],
    [{ id: "log-1", owner_user_id: owner, child_id: "child-1", date: "2026-10-18", type: "dvd", title: "첫 DVD", minutes: 15, note: "기록" }],
  );
  const range = getPeriodDateRange("week", "2026-10-18");
  const before = await store.fetchParentActivityData(fake.client, owner, range);

  // When
  const inactive = await writes.setDvdActive(fake.client, owner, "dvd-1", false);
  const inactiveCatalog = await store.fetchDvdCatalogData(fake.client, owner);
  const active = await writes.setDvdActive(fake.client, owner, "dvd-1", true);
  const after = await store.fetchParentActivityData(fake.client, owner, range);

  // Then
  assert.deepEqual(inactive, { id: "dvd-1", title: "첫 DVD", active: false });
  assert.deepEqual(inactiveCatalog.dvds, [inactive]);
  assert.deepEqual(active, { id: "dvd-1", title: "첫 DVD", active: true });
  assert.deepEqual((await store.fetchDvdCatalogData(fake.client, owner)).dvds, [active]);
  assert.deepEqual(before.manualLogs, [{ id: "log-1", childId: "child-1", date: "2026-10-18", type: "dvd", title: "첫 DVD", minutes: 15, note: "기록", count: 1 }]);
  assert.deepEqual(after.manualLogs, before.manualLogs);
});

test("경계값: 다음 주 활동 조회 전후에 저장된 DVD 목록은 유지된다", async () => {
  // Given
  const fake = createFake([{ id: "dvd-1", owner_user_id: owner, title: "첫 DVD", active: true }]);
  const before = await store.fetchDvdCatalogData(fake.client, owner);
  const nextWeek = shiftSelectedDateKey("2026-10-18", "week", 1);

  // When
  await store.fetchParentActivityData(fake.client, owner, getPeriodDateRange("week", nextWeek));
  const after = await store.fetchDvdCatalogData(fake.client, owner);

  // Then
  assert.deepEqual(before.dvds, [{ id: "dvd-1", title: "첫 DVD", active: true }]);
  assert.deepEqual(after, before);
});
