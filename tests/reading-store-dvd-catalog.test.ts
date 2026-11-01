import assert from "node:assert/strict";
import test from "node:test";
import { emptyReadingData } from "../lib/reading-data";
import * as store from "../lib/supabase/reading-store";

type Dvd = { id: string; title: string; active: boolean };
type DvdRow = { id: string; owner_user_id: string; title: string; active: boolean };
type Client = Parameters<typeof store.fetchLibraryData>[0];
type CatalogStore = { fetchDvdCatalogData(client: Client, owner: string): Promise<{ dvds: Dvd[] }> };
const catalogStore = store as unknown as CatalogStore;
const owner = "owner-1";

function createFake(dvds: DvdRow[], books: Record<string, unknown>[] = []) {
  const rows: Record<string, Record<string, unknown>[]> = { dvds, books };
  const client = {
    from(table: string) {
      assert.ok(table in rows, `예상하지 않은 ${table} 조회`);
      let ownerFilter: unknown;
      let activeFilter: unknown;
      const query = {
        select(_columns: string) { return query; },
        eq(column: string, value: unknown) {
          if (column === "owner_user_id") ownerFilter = value;
          if (column === "active") activeFilter = value;
          return query;
        },
        order(_column: string, _options: unknown) { return query; },
        then(resolve: (result: { data: Record<string, unknown>[]; error: null }) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve().then(() => {
            assert.equal(ownerFilter, owner);
            return { data: rows[table].filter((row) => row.owner_user_id === ownerFilter && (activeFilter === undefined || row.active === activeFilter)), error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
  } as unknown as Client;
  return client;
}

test("경계값: 초기 읽기 데이터에는 빈 DVD 목록이 있다", () => {
  // Given
  const data = emptyReadingData as typeof emptyReadingData & { dvds?: Dvd[] };

  // When
  const actual = data.dvds;

  // Then
  assert.deepEqual(actual, []);
});

test("경계값: DVD 목록이 비어 있으면 빈 목록을 조회한다", async () => {
  // Given
  const client = createFake([]);

  // When
  const actual = await catalogStore.fetchDvdCatalogData(client, owner);

  // Then
  assert.deepEqual(actual, { dvds: [] });
});

test("정상 입력: DVD 조회는 여러 항목의 제목과 활성 상태를 보존해 매핑한다", async () => {
  // Given
  const client = createFake([
    { id: "dvd-1", owner_user_id: owner, title: "첫 DVD", active: true },
    { id: "dvd-2", owner_user_id: owner, title: "둘째 DVD", active: false },
  ]);

  // When
  const actual = await catalogStore.fetchDvdCatalogData(client, owner);

  // Then
  assert.deepEqual(actual, { dvds: [
    { id: "dvd-1", title: "첫 DVD", active: true },
    { id: "dvd-2", title: "둘째 DVD", active: false },
  ] });
});

test("정상 입력: DVD와 책 조회는 서로의 항목을 포함하지 않는다", async () => {
  // Given
  const client = createFake(
    [{ id: "dvd-1", owner_user_id: owner, title: "DVD 제목", active: true }],
    [{ id: "book-1", owner_user_id: owner, active: true, content_type: "book", series: "그림", title: "책 제목", volume: "1", level: "A", cover: "", audio_listen: "", audio_shadow: "", note: "" }],
  );

  // When
  const catalog = await catalogStore.fetchDvdCatalogData(client, owner);
  const library = await store.fetchLibraryData(client, owner);

  // Then
  assert.deepEqual(catalog.dvds, [{ id: "dvd-1", title: "DVD 제목", active: true }]);
  assert.deepEqual(library.books.map((book) => [book.id, book.title]), [["book-1", "책 제목"]]);
});
