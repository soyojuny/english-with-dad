import assert from "node:assert/strict";
import test from "node:test";
import { saveBook, saveChild, setBookActive } from "../lib/supabase/reading-store";
import type { Book } from "../lib/reading-types";

type Table = "children" | "books";
type Mutation = "insert" | "update";
type Filter = { column: string; value: unknown };
type Row = Record<string, unknown>;
type Result = { data: Row | null; error: { message: string } | null } | { rejection: Error };
type MutationPlan = {
  table: Table;
  mutation: Mutation;
  payload: Record<string, unknown>;
  filters?: Filter[];
  select: string;
  result: Result;
};

const owner = "owner-1";
const childColumns = "id, owner_user_id, name, level, goal";
const bookColumns = "id, owner_user_id, active, content_type, series, title, volume, level, cover, audio_listen, audio_shadow, note";

function assertFiltersMatch(actual: Filter[], expected: Filter[], table: Table) {
  assert.deepEqual(
    [...actual].sort((left, right) => left.column.localeCompare(right.column)),
    [...expected].sort((left, right) => left.column.localeCompare(right.column)),
    `${table} mutation은 owner와 id 필터를 정확히 사용해야 한다`,
  );
}

function createMutationFake(plans: MutationPlan[]) {
  const started = new Set<MutationPlan>();
  const executed = new Set<MutationPlan>();

  function from(table: string) {
    const candidates = plans.filter((plan) => plan.table === table && !started.has(plan));
    if (!candidates.length) throw new Error(`예상하지 않은 ${table} mutation은 허용하지 않는다`);
    if (candidates.length > 1) throw new Error(`${table} mutation 계획은 테스트마다 하나여야 한다`);
    const plan = candidates[0];
    started.add(plan);
    const filters: Filter[] = [];
    let mutation: Mutation | undefined;
    let payload: Record<string, unknown> | undefined;
    let selectedColumns: string | undefined;
    let singleCalls = 0;

    async function single() {
      singleCalls += 1;
      assert.equal(singleCalls, 1, `${plan.table} mutation은 single을 한 번만 호출해야 한다`);
      assert.equal(mutation, plan.mutation, `${plan.table}은 예상한 mutation만 사용해야 한다`);
      assert.deepEqual(payload, plan.payload, `${plan.table} ${plan.mutation} payload는 정확해야 한다`);
      assertFiltersMatch(filters, plan.filters ?? [], plan.table);
      assert.equal(selectedColumns, plan.select, `${plan.table} mutation은 정확한 select projection을 사용해야 한다`);
      executed.add(plan);
      if ("rejection" in plan.result) throw plan.result.rejection;
      return structuredClone(plan.result);
    }

    const query = {
      insert(value: Record<string, unknown>) {
        assert.equal(mutation, undefined, `${plan.table} mutation은 한 번만 시작해야 한다`);
        mutation = "insert";
        payload = value;
        return query;
      },
      update(value: Record<string, unknown>) {
        assert.equal(mutation, undefined, `${plan.table} mutation은 한 번만 시작해야 한다`);
        mutation = "update";
        payload = value;
        return query;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return query;
      },
      select(columns: string) {
        assert.equal(selectedColumns, undefined, `${plan.table} mutation은 select를 한 번만 호출해야 한다`);
        selectedColumns = columns;
        return query;
      },
      single,
    };
    return query;
  }

  return {
    client: { from } as unknown as Parameters<typeof saveBook>[0],
    assertComplete() {
      assert.equal(started.size, plans.length, "예정된 mutation을 시작하지 않으면 안 된다");
      assert.equal(executed.size, plans.length, "시작한 mutation은 single까지 실행해야 한다");
    },
  };
}

const savedChild = { id: "child-1", owner_user_id: owner, name: "지율", level: "A", goal: "매일 읽기" };
const savedBook = {
  id: "book-1",
  owner_user_id: owner,
  active: true,
  content_type: "book",
  series: "그림책",
  title: "첫 책",
  volume: "1",
  level: "A",
  cover: "/cover.jpg",
  audio_listen: "https://audio.example/listen",
  audio_shadow: "https://audio.example/shadow",
  note: "메모",
};

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "",
    active: true,
    contentType: "book",
    series: "그림책",
    title: "첫 책",
    volume: "1",
    level: "A",
    cover: "/cover.jpg",
    audio: { listen: "https://audio.example/listen", shadow: "https://audio.example/shadow" },
    note: "메모",
    ...overrides,
  };
}

test("정상 입력: 새 아동은 owner를 포함한 insert 결과를 도메인 아동으로 반환한다", async () => {
  // Given
  const fake = createMutationFake([{ table: "children", mutation: "insert", payload: { owner_user_id: owner, name: "지율", level: "A", goal: "매일 읽기" }, select: childColumns, result: { data: savedChild, error: null } }]);

  // When
  const actual = await saveChild(fake.client, owner, { name: "지율", level: "A", goal: "매일 읽기" });

  // Then
  assert.deepEqual(actual, { id: "child-1", name: "지율", level: "A", goal: "매일 읽기" });
  fake.assertComplete();
});

test("정상 입력: 기존 아동은 owner와 id 범위의 update 결과를 도메인 아동으로 반환한다", async () => {
  // Given
  const fake = createMutationFake([{ table: "children", mutation: "update", payload: { name: "지율", level: "B", goal: "주 5일" }, filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "child-1" }], select: childColumns, result: { data: { ...savedChild, level: "B", goal: "주 5일" }, error: null } }]);

  // When
  const actual = await saveChild(fake.client, owner, { id: "child-1", name: "지율", level: "B", goal: "주 5일" });

  // Then
  assert.deepEqual(actual, { id: "child-1", name: "지율", level: "B", goal: "주 5일" });
  fake.assertComplete();
});

test("정상 입력: 새 일반 책은 모든 선택 문자열을 빈 값 그대로 insert하고 도메인 책으로 반환한다", async () => {
  // Given
  const input = book({ volume: "", level: "", cover: "", audio: { listen: "", shadow: "" }, note: "" });
  const fake = createMutationFake([{ table: "books", mutation: "insert", payload: { owner_user_id: owner, active: true, content_type: "book", series: "그림책", title: "첫 책", volume: "", level: "", cover: "", audio_listen: "", audio_shadow: "", note: "" }, select: bookColumns, result: { data: { ...savedBook, volume: "", level: "", cover: "", audio_listen: "", audio_shadow: "", note: "" }, error: null } }]);

  // When
  const actual = await saveBook(fake.client, owner, input);

  // Then
  assert.deepEqual(actual, { ...input, id: "book-1" });
  fake.assertComplete();
});

test("경계값: 새 단어 읽기 자료는 빈 선택 필드를 null로 바꾸지 않고 저장한다", async () => {
  // Given
  const input = book({ contentType: "wordReading", series: "기타학습", title: "Sight Words", volume: "", level: "", cover: "/assets/app-icon.svg", audio: { listen: "https://audio.example/word", shadow: "" }, note: "" });
  const fake = createMutationFake([{ table: "books", mutation: "insert", payload: { owner_user_id: owner, active: true, content_type: "wordReading", series: "기타학습", title: "Sight Words", volume: "", level: "", cover: "/assets/app-icon.svg", audio_listen: "https://audio.example/word", audio_shadow: "", note: "" }, select: bookColumns, result: { data: { ...savedBook, content_type: "wordReading", series: "기타학습", title: "Sight Words", volume: "", level: "", cover: "/assets/app-icon.svg", audio_listen: "https://audio.example/word", audio_shadow: "", note: "" }, error: null } }]);

  // When
  const actual = await saveBook(fake.client, owner, input);

  // Then
  assert.deepEqual(actual, { ...input, id: "book-1" });
  fake.assertComplete();
});

test("경계값: 기존 비활성 책을 편집해도 active false를 update payload와 반환값에 보존한다", async () => {
  // Given
  const input = book({ id: "book-1", active: false, title: "고친 책" });
  const fake = createMutationFake([{ table: "books", mutation: "update", payload: { owner_user_id: owner, active: false, content_type: "book", series: "그림책", title: "고친 책", volume: "1", level: "A", cover: "/cover.jpg", audio_listen: "https://audio.example/listen", audio_shadow: "https://audio.example/shadow", note: "메모" }, filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "book-1" }], select: bookColumns, result: { data: { ...savedBook, active: false, title: "고친 책" }, error: null } }]);

  // When
  const actual = await saveBook(fake.client, owner, input);

  // Then
  assert.deepEqual(actual, { ...input });
  fake.assertComplete();
});

test("경계값: 저장 row의 null content_type은 기본 일반 책으로 매핑한다", async () => {
  // Given
  const input = book();
  const fake = createMutationFake([{ table: "books", mutation: "insert", payload: { owner_user_id: owner, active: true, content_type: "book", series: "그림책", title: "첫 책", volume: "1", level: "A", cover: "/cover.jpg", audio_listen: "https://audio.example/listen", audio_shadow: "https://audio.example/shadow", note: "메모" }, select: bookColumns, result: { data: { ...savedBook, content_type: null }, error: null } }]);

  // When
  const actual = await saveBook(fake.client, owner, input);

  // Then
  assert.equal(actual.contentType, "book");
  fake.assertComplete();
});

test("정상 입력: 비활성화는 owner와 id 범위에서 active false만 변경한다", async () => {
  // Given
  const fake = createMutationFake([{ table: "books", mutation: "update", payload: { active: false }, filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "book-1" }], select: bookColumns, result: { data: { ...savedBook, active: false }, error: null } }]);

  // When
  const actual = await setBookActive(fake.client, owner, "book-1", false);

  // Then
  assert.equal(actual.active, false);
  fake.assertComplete();
});

test("정상 입력: 재활성화는 owner와 id 범위에서 active true만 변경한다", async () => {
  // Given
  const fake = createMutationFake([{ table: "books", mutation: "update", payload: { active: true }, filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "book-1" }], select: bookColumns, result: { data: savedBook, error: null } }]);

  // When
  const actual = await setBookActive(fake.client, owner, "book-1", true);

  // Then
  assert.equal(actual.active, true);
  fake.assertComplete();
});

test("잘못된 입력/실패: 아동 저장은 DB error를 성공처럼 반환하지 않는다", async () => {
  // Given
  const fake = createMutationFake([{ table: "children", mutation: "insert", payload: { owner_user_id: owner, name: "지율", level: "A", goal: "매일 읽기" }, select: childColumns, result: { data: null, error: { message: "child denied" } } }]);

  // When
  const actual = saveChild(fake.client, owner, { name: "지율", level: "A", goal: "매일 읽기" });

  // Then
  await assert.rejects(actual, /child denied/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 책 저장은 single data null을 성공처럼 반환하지 않는다", async () => {
  // Given
  const fake = createMutationFake([{ table: "books", mutation: "insert", payload: { owner_user_id: owner, active: true, content_type: "book", series: "그림책", title: "첫 책", volume: "1", level: "A", cover: "/cover.jpg", audio_listen: "https://audio.example/listen", audio_shadow: "https://audio.example/shadow", note: "메모" }, select: bookColumns, result: { data: null, error: null } }]);

  // When
  const actual = saveBook(fake.client, owner, book());

  // Then
  await assert.rejects(actual, /책을 추가하지 못했습니다/);
  fake.assertComplete();
});

test("잘못된 입력/실패: 활성 상태 변경은 Promise rejection을 성공처럼 반환하지 않는다", async () => {
  // Given
  const fake = createMutationFake([{ table: "books", mutation: "update", payload: { active: false }, filters: [{ column: "owner_user_id", value: owner }, { column: "id", value: "book-1" }], select: bookColumns, result: { rejection: new Error("network unavailable") } }]);

  // When
  const actual = setBookActive(fake.client, owner, "book-1", false);

  // Then
  await assert.rejects(actual, /network unavailable/);
  fake.assertComplete();
});
