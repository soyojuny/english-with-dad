import assert from "node:assert/strict";
import { test } from "node:test";
import { planAssignments } from "./plan-assignments.mjs";

const id = (number) => `00000000-0000-0000-0000-${String(number).padStart(12, "0")}`;
const bookIds = (count) => Array.from({ length: count }, (_, index) => id(index + 10));
const bundle = (child, purpose, count) => ({ child, purpose, childId: id(child === "first" ? 2 : 3), bookIds: bookIds(count) });
const input = (bundles, weeks = 1, startSunday = "2026-10-11") => ({ ownerUserId: id(1), startSunday, weeks, bundles });
const dates = (rows) => [...new Set(rows.map((row) => row.date))];
const booksOn = (rows, date) => rows.filter((row) => row.date === date).map((row) => row.book_id);

for (const [child, purpose, weeklyBooks, weeklyRows, repeats] of [
  ["first", "reading", 3, 6, 2],
  ["first", "shadow", 2, 6, 3],
  ["first", "picture", 2, 12, 6],
  ["second", "reading", 4, 12, 3],
  ["second", "shadow", 1, 6, 6],
  ["second", "picture", 2, 12, 6],
]) {
  for (const weeks of [1, 2]) {
    test(`${child} ${purpose} ${weeks}주: 권수·반복일·배정 행 수`, () => {
      const selected = bundle(child, purpose, weeklyBooks * weeks);
      selected.bookIds.reverse();
      const result = planAssignments(input([selected], weeks));
      assert.equal(result.assignments.length, weeklyRows * weeks);
      assert.deepEqual([...new Set(result.assignments.map((row) => row.book_id))], selected.bookIds);
      for (const bookId of selected.bookIds) {
        assert.equal(result.assignments.filter((row) => row.book_id === bookId).length, repeats);
      }
      assert.equal(dates(result.assignments).length, 6 * weeks);
      const keys = result.assignments.map((row) => `${row.child_id}:${row.date}:${row.book_id}:${row.activity_category}`);
      assert.equal(new Set(keys).size, keys.length);
    });
  }
}

test("첫째 읽기는 두 날마다 교체하고 매일 문제풀이를 포함한다", () => {
  const rows = planAssignments(input([bundle("first", "reading", 3)])).assignments;
  assert.deepEqual(booksOn(rows, "2026-10-11"), [id(10)]);
  assert.deepEqual(booksOn(rows, "2026-10-12"), [id(10)]);
  assert.deepEqual(booksOn(rows, "2026-10-13"), [id(11)]);
  assert.deepEqual(booksOn(rows, "2026-10-16"), [id(12)]);
  assert.equal(rows.length, 6);
  for (const row of rows) {
    assert.equal(row.activity_category, "focusListen");
    assert.deepEqual(row.tasks, ["listen"]);
    assert.deepEqual(row.task_counts, { listen: 1 });
    assert.equal(row.quiz_enabled, true);
  }
});

test("첫째 정따는 세 날마다 교체하고 세 활동·문제풀이를 매일 적용한다", () => {
  const rows = planAssignments(input([bundle("first", "shadow", 2)])).assignments;
  assert.deepEqual(rows.map((row) => row.book_id), [id(10), id(10), id(10), id(11), id(11), id(11)]);
  for (const row of rows) {
    assert.equal(row.activity_category, "readAloud");
    assert.deepEqual(row.task_counts, { listen: 1, shadow: 1, self: 1 });
    assert.equal(row.quiz_enabled, true);
  }
});

test("둘째 정따는 2주 동안 주별 한 권, 모든 날 세 활동 각 1회다", () => {
  const result = planAssignments(input([bundle("second", "shadow", 2)], 2));
  assert.equal(result.assignments.length, 12);
  assert.equal(result.endDate, "2026-10-23");
  assert.deepEqual(dates(result.assignments), [
    "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16",
    "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23",
  ]);
  for (const row of result.assignments) {
    assert.equal(row.book_id, row.date < "2026-10-18" ? id(10) : id(11));
    assert.deepEqual(row.tasks, ["listen", "shadow", "self"]);
    assert.deepEqual(row.task_counts, { listen: 1, shadow: 1, self: 1 });
    assert.equal(row.quiz_enabled, false);
  }
});

test("둘째 읽기는 지정 순서대로 두 권씩 세 날 동안 배정한다", () => {
  const rows = planAssignments(input([bundle("second", "reading", 8)], 2)).assignments;
  assert.equal(rows.length, 24);
  assert.deepEqual(booksOn(rows, "2026-10-11"), [id(10), id(11)]);
  assert.deepEqual(booksOn(rows, "2026-10-13"), [id(10), id(11)]);
  assert.deepEqual(booksOn(rows, "2026-10-14"), [id(12), id(13)]);
  assert.deepEqual(booksOn(rows, "2026-10-18"), [id(14), id(15)]);
  assert.deepEqual(booksOn(rows, "2026-10-23"), [id(16), id(17)]);
  assert(rows.every((row) => row.quiz_enabled === false && row.task_counts.listen === 1));
});

test("두 아동이 같은 그림책을 공유해도 배정과 소유는 분리된다", () => {
  const rows = planAssignments(input([bundle("first", "picture", 4), bundle("second", "picture", 4)], 2)).assignments;
  assert.equal(rows.length, 48);
  for (const childId of [id(2), id(3)]) {
    const childRows = rows.filter((row) => row.child_id === childId);
    assert.deepEqual(booksOn(childRows, "2026-10-11"), [id(10), id(11)]);
    assert.deepEqual(booksOn(childRows, "2026-10-18"), [id(12), id(13)]);
  }
  for (const row of rows) {
    assert.equal(row.owner_user_id, id(1));
    assert.equal(row.activity_category, "englishPicture");
    assert.deepEqual(row.task_counts, { listen: 1 });
    assert.equal(row.quiz_enabled, false);
  }
});

test("월·연도·윤년 경계에서도 토요일을 제외하고 정확한 날짜를 생성한다", () => {
  const year = planAssignments(input([bundle("second", "shadow", 2)], 2, "2026-12-27"));
  assert.equal(year.endDate, "2027-01-08");
  assert.equal(year.assignments[6].date, "2027-01-03");
  const leap = planAssignments(input([bundle("second", "shadow", 1)], 1, "2032-02-29"));
  assert.equal(leap.endDate, "2032-03-05");
  for (const row of [...year.assignments, ...leap.assignments]) {
    assert.notEqual(new Date(`${row.date}T00:00:00Z`).getUTCDay(), 6);
  }
});

test("잘못된 입력으로 저장 후보를 생성하지 않는다", () => {
  const valid = input([bundle("second", "shadow", 1)]);
  for (const startSunday of ["2026-10-12", "2026-02-29", "2026-10-32", "10/11/2026", undefined]) {
    assert.throws(() => planAssignments({ ...valid, startSunday }), /일요일/);
  }
  for (const weeks of [0, 3, "1", undefined]) {
    assert.throws(() => planAssignments({ ...valid, weeks }), /1주 또는 2주/);
  }
  assert.throws(() => planAssignments(input([bundle("first", "reading", 2)])), /3권/);
  assert.throws(() => planAssignments(input([bundle("second", "shadow", 2)])), /1권/);
  assert.throws(() => planAssignments({ ...valid, ownerUserId: "unknown" }), /UUID/);
  assert.throws(() => planAssignments(input([])), /묶음/);
  assert.throws(() => planAssignments(input([{ ...valid.bundles[0], purpose: "unknown" }])), /용도/);
  assert.throws(() => planAssignments(input([{ ...valid.bundles[0], childId: "unknown" }])), /UUID/);
  assert.throws(() => planAssignments(input([{ ...valid.bundles[0], bookIds: ["unknown"] }])), /UUID/);
  assert.throws(() => planAssignments(input([{ ...bundle("first", "picture", 2), bookIds: [id(10), id(10)] }])), /중복 ID/);
  assert.throws(() => planAssignments(input([valid.bundles[0], valid.bundles[0]])), /중복/);
  assert.throws(() => planAssignments(input([bundle("first", "picture", 2), { ...bundle("second", "shadow", 1), childId: id(2) }])), /매핑/);
  const childId = "abcdefab-0000-0000-0000-000000000002";
  assert.throws(() => planAssignments(input([
    { ...bundle("first", "picture", 2), childId },
    { ...bundle("second", "picture", 2), childId: childId.toUpperCase() },
  ])), /매핑/);
});
