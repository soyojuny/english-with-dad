import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { planAssignments } from "./plan-assignments.mjs";
import { coverContract, fingerprint, processCover } from "./process-cover.mjs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const routinesPath = new URL("../references/routines.json", import.meta.url);

function requireId(value, label) {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new Error(`${label}: UUID가 필요합니다.`);
  return value.toLowerCase();
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}: 비어 있지 않은 문자열이 필요합니다.`);
  return value;
}

function audioUrl(value, label) {
  if (value === "" || value === undefined) return "";
  if (typeof value !== "string" || value !== value.trim()) throw new Error(`${label}: HTTP(S) URL이 필요합니다.`);
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${label}: HTTP(S) URL이 필요합니다.`);
  return value; // Preserve the supplied query string and spelling.
}

function applyOverrides(assignments, bundles) {
  for (const bundle of bundles) {
    const overrides = bundle.overrides ?? [];
    if (!Array.isArray(overrides)) throw new Error("책별 예외는 배열이어야 합니다.");
    const seen = new Set();
    for (const override of overrides) {
      const id = requireId(override.bookId, "예외 책");
      requireText(override.reason, "부모가 지정한 예외의 근거");
      if (!bundle.bookIds.some((bookId) => bookId.toLowerCase() === id) || seen.has(id)) {
        throw new Error("책별 예외의 책은 해당 묶음에 한 번만 지정해야 합니다.");
      }
      seen.add(id);
      const allowed = bundle.purpose === "shadow" ? ["listen", "shadow", "self"] : ["listen"];
      const counts = override.taskCounts;
      if (!counts || !Object.keys(counts).length || Object.entries(counts).some(([task, count]) =>
        !allowed.includes(task) || !Number.isInteger(count) || count < 1 || count > 3)) {
        throw new Error("책별 예외의 활동·횟수는 용도에 맞는 1~3회여야 합니다.");
      }
      if (override.quizEnabled !== undefined && typeof override.quizEnabled !== "boolean") {
        throw new Error("예외 quizEnabled는 boolean이어야 합니다.");
      }
      for (const row of assignments.filter((row) => row.child_id === bundle.childId.toLowerCase() &&
        row.book_id === id && row.activity_category === (bundle.purpose === "shadow" ? "readAloud" :
          bundle.purpose === "reading" ? "focusListen" : "englishPicture"))) {
        row.tasks = Object.keys(counts);
        row.task_counts = { ...counts };
        if (override.quizEnabled !== undefined) row.quiz_enabled = override.quizEnabled;
      }
    }
  }
}

export async function prepareBatch(input, baseDirectory) {
  if (input.schemaVersion !== 1) throw new Error("schemaVersion은 1이어야 합니다.");
  const ownerUserId = requireId(input.ownerUserId, "부모 계정");
  requireText(input.projectRef, "확인할 Supabase 프로젝트 ref");
  if (!Array.isArray(input.books) || !input.books.length) throw new Error("책 목록이 필요합니다.");
  const ids = new Set();
  const titles = new Set();
  const books = input.books.map((book) => {
    const id = requireId(book.id, "책");
    if (ids.has(id)) throw new Error("책 ID가 중복되었습니다. 한 책을 여러 묶음에서 참조하세요.");
    ids.add(id);
    if (!["create", "reuse"].includes(book.action)) throw new Error("책 action은 create/reuse여야 합니다.");
    requireText(book.title, "제목");
    for (const field of ["series", "volume", "level", "note"]) {
      if (book[field] !== undefined && typeof book[field] !== "string") throw new Error(`${field}: 문자열이 필요합니다.`);
    }
    const titleKey = [book.series ?? "", book.title, book.volume ?? ""]
      .map((value) => value.trim().replace(/\s+/g, " ").toLowerCase()).join("\0");
    if (titles.has(titleKey)) throw new Error("시리즈·제목·권수가 같은 중복 책 후보입니다. 조회 후 한 책으로 확정하세요.");
    titles.add(titleKey);
    if (book.active !== true) throw new Error("책의 active=true를 확인해야 합니다.");
    const audio = { listen: audioUrl(book.audio?.listen, "읽기"), shadow: audioUrl(book.audio?.shadow, "정따") };
    if (audio.listen && audio.listen === audio.shadow && book.sharedAudioConfirmed !== true) {
      throw new Error("공용 링크의 두 필드 사용은 sharedAudioConfirmed=true 확인이 필요합니다.");
    }
    if (book.action === "create") requireText(book.sourceCover, "원본 표지 경로");
    if ("correctedCover" in book || "correctionReviewed" in book) {
      throw new Error("표지 보정 입력은 지원하지 않습니다. 사용자가 준비한 파일을 sourceCover로 지정하세요.");
    }
    return { ...book, id, audio };
  });
  const bundles = input.bundles ?? [];
  if (!Array.isArray(bundles)) throw new Error("bundles는 배열이어야 합니다.");
  if (!bundles.length && (input.startSunday !== undefined || input.weeks !== undefined)) {
    throw new Error("날짜·주차가 지정된 배정에는 아동·용도 묶음이 필요합니다.");
  }
  const schedule = bundles.length ? planAssignments({ ...input, ownerUserId }) : null;
  const assignments = schedule?.assignments ?? [];
  applyOverrides(assignments, bundles);
  const byId = new Map(books.map((book) => [book.id, book]));
  for (const row of assignments) {
    const book = byId.get(row.book_id);
    if (!book) throw new Error(`배정 책 ${row.book_id}가 책 목록에 없습니다.`);
    if ((row.tasks.includes("listen") && !book.audio.listen) ||
        (row.tasks.includes("shadow") && !book.audio.shadow)) {
      throw new Error(`${book.title}: 배정 활동의 필수 오디오 필드가 비어 있습니다.`);
    }
  }
  const newBooks = [];
  const covers = [];
  for (const book of books.filter((book) => book.action === "create")) {
    const sourcePath = resolve(baseDirectory, book.sourceCover);
    const processed = await processCover(sourcePath);
    covers.push({
      bookId: book.id,
      original: processed.source,
      processed: processed.processed,
    });
    newBooks.push({
      id: book.id, owner_user_id: ownerUserId, active: true, content_type: "book",
      title: book.title, series: book.series ?? "", volume: book.volume ?? "", level: book.level ?? "",
      cover: processed.dataUrl, audio_listen: book.audio.listen, audio_shadow: book.audio.shadow, note: book.note ?? "",
    });
  }
  const routines = await readFile(routinesPath);
  return {
    payload: { books: newBooks, assignments },
    prepared: {
      status: "prepared",
      projectRef: input.projectRef,
      ownerUserId,
      ownershipChecked: false,
      contract: coverContract,
      routine: { updatedAt: JSON.parse(routines).updatedAt, ...fingerprint(routines) },
      books: books.map(({ id, action, title, series, audio }) => ({ id, action, title, series: series ?? "", audio })),
      bundles,
      startSunday: schedule?.startSunday ?? null,
      endDate: schedule?.endDate ?? null,
      weeks: schedule?.weeks ?? null,
      reusedBookIds: books.filter((book) => book.action === "reuse").map((book) => book.id),
      covers,
      // A DB requery is still required; preparation cannot assert ownership or absence of overlaps.
      pendingChecks: ["project/owner/child/book ownership", "active status", "title/audio duplicates", "full date-range overlaps", "saved field/hash comparison", "logged-in app/audio"],
    },
  };
}

function reportBatch({ prepared, payload }) {
  const byId = new Map(prepared.books.map((book) => [book.id, book]));
  const lines = ["# 책 등록 준비 결과", "", "상태: prepared — DB 미저장·소유/중복/기간 겹침 미확인", "",
    `신규 책 ${payload.books.length}권 / 재사용 후보 ${prepared.reusedBookIds.length}권 / 배정 ${payload.assignments.length}행`, ""];
  for (const cover of prepared.covers) {
    const source = cover.original;
    const target = cover.processed;
    lines.push(`${byId.get(cover.bookId).title}: ${source.width}×${source.height}, ${source.bytes}B → ${target.width}×${target.height}, ${target.bytes}B; SHA-256 ${target.sha256}`);
  }
  lines.push("", "## 날짜별 배정", "");
  for (const row of payload.assignments) {
    const counts = row.tasks.map((task) => `${task} ${row.task_counts[task]}회`).join(", ");
    lines.push(`${row.date} | ${row.child_id} | ${byId.get(row.book_id).title} | ${row.activity_category} | ${counts} | 퀴즈 ${row.quiz_enabled ? "있음" : "없음"}`);
  }
  return `${lines.join("\n")}\n`;
}

export async function writePreparedBatch(manifestPath, outputDirectory) {
  const manifestBytes = await readFile(manifestPath);
  const input = JSON.parse(manifestBytes.toString("utf8"));
  const batch = await prepareBatch(input, dirname(resolve(manifestPath)));
  const outputPath = resolve(outputDirectory);
  const artifacts = {
    "manifest.json": manifestBytes,
    "prepared.json": `${JSON.stringify({ ...batch.prepared, manifest: fingerprint(manifestBytes) }, null, 2)}\n`,
    "payload.json": `${JSON.stringify(batch.payload, null, 2)}\n`,
    "report.md": reportBatch(batch),
  };
  // Refuse an existing directory; failed/partial output is never overwritten on retry.
  await mkdir(outputPath);
  for (const [name, content] of Object.entries(artifacts)) await writeFile(resolve(outputPath, name), content, { flag: "wx" });
  const checksums = Object.fromEntries(Object.entries(artifacts).map(([name, content]) => [name, fingerprint(content)]));
  await writeFile(resolve(outputPath, "checksums.json"), `${JSON.stringify(checksums, null, 2)}\n`, { flag: "wx" });
  await writeFile(resolve(outputPath, "result.json"), `${JSON.stringify({
    batchSha256: checksums["payload.json"].sha256, status: "prepared",
    createdBookIds: [], reusedBookIds: [], createdAssignmentIds: [], reusedAssignmentIds: [],
    dbVerification: "pending", appVerification: "pending", unresolved: [],
  }, null, 2)}\n`, { flag: "wx" });
  return { status: "prepared", outputDirectory: outputPath, newBooks: batch.payload.books.length,
    reuseCandidates: batch.prepared.reusedBookIds.length, assignments: batch.payload.assignments.length,
    covers: batch.prepared.covers, payload: checksums["payload.json"] };
}

export async function checkPreparedBatch(directory) {
  const checksums = JSON.parse(await readFile(resolve(directory, "checksums.json"), "utf8"));
  for (const name of ["manifest.json", "prepared.json", "payload.json", "report.md"]) {
    const expected = checksums[name];
    const actual = fingerprint(await readFile(resolve(directory, name)));
    if (!expected || expected.bytes !== actual.bytes || expected.sha256 !== actual.sha256) {
      throw new Error(`${name}: 바이트 길이·SHA-256이 일치하지 않습니다.`);
    }
  }
  return { status: "prepared", integrity: "verified", directory: resolve(directory) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2) throw new Error(`사용법: node ${basename(process.argv[1])} <명세.json> <새 출력 폴더> 또는 --check <출력 폴더>`);
    const result = args[0] === "--check" ? await checkPreparedBatch(args[1]) : await writePreparedBatch(...args);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
