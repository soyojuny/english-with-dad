import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import sharp from "sharp";
import { checkPreparedBatch, prepareBatch, writePreparedBatch } from "./prepare-batch.mjs";

const id = (number) => `00000000-0000-0000-0000-${String(number).padStart(12, "0")}`;
const book = (number, action = "reuse") => ({
  id: id(number), action, active: true, title: `책 ${number}`, series: "시리즈",
  audio: { listen: `https://example.com/listen/${number}?q=1&n=2`, shadow: `https://example.com/shadow/${number}` },
  ...(action === "create" ? { sourceCover: "original.png" } : {}),
});
const input = (books = [book(10)], bundles) => ({
  schemaVersion: 1, projectRef: "test-project", ownerUserId: id(1), books,
  ...(bundles ? { startSunday: "2026-10-11", weeks: 1, bundles } : {}),
});
const bundle = (bookIds = [id(10)]) => ({ child: "second", childId: id(2), purpose: "shadow", bookIds });

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "ewd-batch-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await sharp({ create: { width: 60, height: 90, channels: 3, background: "#dddddd" } })
    .png().toFile(join(directory, "original.png"));
  return directory;
}

test("등록만 준비하면 배정 없이 표지와 신규 책 필드를 만들고 원본을 보존한다", async (t) => {
  // Given
  const directory = await fixture(t);
  const original = await readFile(join(directory, "original.png"));
  const selected = book(10, "create");
  // When
  const result = await prepareBatch(input([selected]), directory);
  // Then
  assert.deepEqual(result.payload.assignments, []);
  assert.equal(result.payload.books[0].title, "책 10");
  assert.equal(result.payload.books[0].audio_listen, selected.audio.listen);
  assert.equal(result.payload.books[0].audio_shadow, selected.audio.shadow);
  assert.equal(result.payload.books[0].owner_user_id, id(1));
  assert.equal(result.prepared.status, "prepared");
  assert.equal(result.prepared.ownershipChecked, false);
  assert.deepEqual(await readFile(join(directory, "original.png")), original);
});

test("두 아동·2주의 지정 순서를 기존 생성기 규칙으로 보존한다", async () => {
  // Given
  const books = [10, 11, 12, 13].map((number) => book(number));
  const selected = input(books, [
    { child: "first", childId: id(2), purpose: "shadow", bookIds: [id(13), id(12), id(11), id(10)] },
    { child: "second", childId: id(3), purpose: "shadow", bookIds: [id(10), id(11)] },
  ]);
  selected.weeks = 2;
  // When
  const result = await prepareBatch(selected, "/tmp");
  // Then
  assert.equal(result.payload.assignments.length, 24);
  assert.equal(result.prepared.endDate, "2026-10-23");
  const first = result.payload.assignments.filter((row) => row.child_id === id(2));
  assert.deepEqual([...new Set(first.map((row) => row.book_id))], [id(13), id(12), id(11), id(10)]);
  assert(result.payload.assignments.every((row) => row.owner_user_id === id(1)));
});

test("부모가 지정한 책별 예외만 적용하고 기본 루틴과 다른 묶음은 유지한다", async () => {
  // Given
  const selected = input([book(10), book(11)], [
    { child: "first", childId: id(2), purpose: "shadow", bookIds: [id(10), id(11)], overrides: [
      { bookId: id(10), taskCounts: { listen: 1, shadow: 1, self: 1 }, reason: "이 책의 별도 읽기를 부모가 지정" },
    ] },
  ]);
  // When
  const result = await prepareBatch(selected, "/tmp");
  // Then
  const changed = result.payload.assignments.filter((row) => row.book_id === id(10));
  const defaults = result.payload.assignments.filter((row) => row.book_id === id(11));
  assert(changed.every((row) => row.tasks.includes("listen") && row.quiz_enabled));
  assert(defaults.every((row) => !row.tasks.includes("listen") && row.quiz_enabled));
  assert.equal(result.prepared.bundles[0].overrides[0].reason, "이 책의 별도 읽기를 부모가 지정");
});

test("공용 링크 확인을 해도 합의되지 않은 읽기 과제는 자동 추가하지 않는다", async () => {
  // Given
  const selected = book(10);
  selected.audio.shadow = selected.audio.listen;
  selected.sharedAudioConfirmed = true;
  const manifest = input([selected, book(11)], [
    { child: "first", childId: id(2), purpose: "shadow", bookIds: [id(10), id(11)] },
  ]);
  // When
  const result = await prepareBatch(manifest, "/tmp");
  // Then
  assert(result.payload.assignments.every((row) => !row.tasks.includes("listen")));
});

for (const [label, change, message] of [
  ["중복 ID", (value) => value.books.push({ ...value.books[0] }), /중복/],
  ["중복 제목", (value) => value.books.push({ ...value.books[0], id: id(11) }), /중복/],
  ["비활성 책", (value) => { value.books[0].active = false; }, /active/],
  ["잘못된 URL", (value) => { value.books[0].audio.shadow = "file:///tmp/a"; }, /HTTP/],
  ["읽기 필드에만 있는 정따 링크", (value) => { value.books[0].audio.shadow = ""; }, /필수 오디오/],
  ["확인되지 않은 공용 링크", (value) => { value.books[0].audio.shadow = value.books[0].audio.listen; }, /sharedAudioConfirmed/],
  ["일요일이 아닌 날짜", (value) => { value.startSunday = "2026-10-12"; }, /일요일/],
  ["책 수 부족", (value) => { value.weeks = 2; }, /2권/],
  ["책 목록에 없는 배정", (value) => { value.bundles[0].bookIds = [id(99)]; }, /책 목록/],
  ["근거 없는 예외", (value) => { value.bundles[0].overrides = [{ bookId: id(10), taskCounts: { self: 1 } }]; }, /근거/],
  ["범위 밖 활동 예외", (value) => { value.bundles[0].overrides = [{ bookId: id(10), taskCounts: { copywork: 1 }, reason: "test" }]; }, /활동/],
]) {
  test(`준비 단계에서 거부: ${label}`, async () => {
    // Given
    const manifest = input([book(10)], [bundle()]);
    change(manifest);
    // When
    const action = () => prepareBatch(manifest, "/tmp");
    // Then
    await assert.rejects(action, message);
  });
}

test("누락 사진은 출력 폴더 생성 전에 거부한다", async (t) => {
  // Given
  const directory = await fixture(t);
  const manifestPath = join(directory, "input.json");
  const manifest = input([{ ...book(10, "create"), sourceCover: "missing.png" }]);
  await writeFile(manifestPath, JSON.stringify(manifest));
  // When
  const action = () => writePreparedBatch(manifestPath, join(directory, "output"));
  // Then
  await assert.rejects(action, /ENOENT/);
  assert(!(await readdir(directory)).includes("output"));
});

for (const [field, value] of [["correctedCover", "unused.png"], ["correctionReviewed", true]]) {
  test(`제외된 표지 보정 필드 ${field} 대신 단일 입력 표지를 요구한다`, async (t) => {
    // Given
    const directory = await fixture(t);
    const selected = { ...book(10, "create"), [field]: value };
    // When
    const action = () => prepareBatch(input([selected]), directory);
    // Then
    await assert.rejects(action, /sourceCover/);
  });
}

test("준비 파일의 무결성을 확인하고 기존 출력 폴더 덮어쓰기를 거부한다", async (t) => {
  // Given
  const directory = await fixture(t);
  const manifestPath = join(directory, "input.json");
  await writeFile(manifestPath, JSON.stringify(input([book(10, "create")], [bundle()])));
  const output = join(directory, "output");
  // When
  const summary = await writePreparedBatch(manifestPath, output);
  const checked = await checkPreparedBatch(output);
  // Then
  assert.equal(summary.assignments, 6);
  assert.equal(checked.integrity, "verified");
  assert((await readFile(join(output, "report.md"), "utf8")).includes("책 10"));
  const result = JSON.parse(await readFile(join(output, "result.json"), "utf8"));
  assert.equal(result.status, "prepared");
  assert.equal(result.dbVerification, "pending");
  assert.equal(result.appVerification, "pending");
  await assert.rejects(() => writePreparedBatch(manifestPath, output), /EEXIST/);
  await writeFile(join(output, "payload.json"), "{}");
  await assert.rejects(() => checkPreparedBatch(output), /SHA-256/);
});

test("CLI는 잘린 JSON을 거부하고 정상 실행 stdout에는 base64를 출력하지 않는다", async (t) => {
  // Given
  const directory = await fixture(t);
  const manifestPath = join(directory, "input.json");
  const script = fileURLToPath(new URL("./prepare-batch.mjs", import.meta.url));
  await writeFile(manifestPath, JSON.stringify(input([book(10, "create")])));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  // When
  const normal = spawnSync(process.execPath, [script, manifestPath, join(directory, "output")], { encoding: "utf8", env });
  await writeFile(manifestPath, '{"schemaVersion":');
  const invalid = spawnSync(process.execPath, [script, manifestPath, join(directory, "invalid")], { encoding: "utf8", env });
  const check = spawnSync(process.execPath, [script, "--check", join(directory, "output")], { encoding: "utf8", env });
  // Then
  assert.ifError(normal.error);
  assert.ifError(invalid.error);
  assert.ifError(check.error);
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(check.status, 0, check.stderr);
  assert(!normal.stdout.includes("data:image"));
  assert.equal(JSON.parse(normal.stdout).newBooks, 1);
  assert.notEqual(invalid.status, 0);
  assert(!(await readdir(directory)).includes("invalid"));
});
