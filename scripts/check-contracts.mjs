import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

async function requireFile(relativePath) {
  if (!(await exists(relativePath))) {
    fail(`Missing required file: ${relativePath}`);
  }
}

function requireIncludes(content, needle, relativePath) {
  if (!content.includes(needle)) {
    fail(`${relativePath} must include: ${needle}`);
  }
}

function requireRegex(content, regex, relativePath, message) {
  if (!regex.test(content)) {
    fail(`${relativePath}: ${message}`);
  }
}

function requireUnionMembers(content, typeName, expected, relativePath) {
  const match = content.match(new RegExp(`export type ${typeName} = ([^;]+);`));
  if (!match) {
    fail(`${relativePath}: missing ${typeName} union`);
    return;
  }

  for (const value of expected) {
    if (!match[1].includes(`"${value}"`)) {
      fail(`${relativePath}: ${typeName} must include "${value}"`);
    }
  }
}

for (const relativePath of [
  "AGENTS.md",
  ".agents/skills/ewd-feature-change/SKILL.md",
  ".agents/skills/ewd-supabase-change/SKILL.md",
  ".agents/skills/ewd-ui-regression/SKILL.md",
  "docs/development-harness.md",
  "lib/reading-calculations.ts",
  "lib/reading-types.ts",
  "lib/reading-data.ts",
  "lib/supabase/reading-store.ts",
  "tests/reading-calculations.test.ts",
  "tsconfig.test.json",
  "supabase/migrations/20260608213000_init.sql",
]) {
  await requireFile(relativePath);
}

const packageJson = JSON.parse(await read("package.json"));
for (const scriptName of ["check:contracts", "check:sw", "check:pwa", "test:unit", "typecheck", "build", "verify"]) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json scripts must define ${scriptName}`);
  }
}

const gitignore = await read(".gitignore");
for (const ignoredLegacyPath of ["/app.js", "/index.html", "/manifest.webmanifest", "/sw.js"]) {
  requireIncludes(gitignore, ignoredLegacyPath, ".gitignore");
}

const types = await read("lib/reading-types.ts");
requireUnionMembers(types, "TaskType", ["listen", "shadow", "self"], "lib/reading-types.ts");
requireUnionMembers(
  types,
  "ActivityCategory",
  ["focusListen", "readAloud", "englishPicture"],
  "lib/reading-types.ts",
);
requireUnionMembers(
  types,
  "ManualLogType",
  ["dvd", "passiveListen", "korean", "englishPicture", "extraStudy"],
  "lib/reading-types.ts",
);

const data = await read("lib/reading-data.ts");
for (const key of ["listen", "shadow", "self"]) {
  requireRegex(data, new RegExp(`${key}: \\{ label:`), "lib/reading-data.ts", `missing task definition for ${key}`);
}
for (const key of ["focusListen", "readAloud", "englishPicture"]) {
  requireRegex(
    data,
    new RegExp(`${key}: \\{ label:`),
    "lib/reading-data.ts",
    `missing activity category definition for ${key}`,
  );
}
for (const key of ["dvd", "passiveListen", "listen", "shadow", "self", "korean", "englishPicture", "extraStudy"]) {
  requireRegex(data, new RegExp(`${key}: "`), "lib/reading-data.ts", `missing log label for ${key}`);
}

const calculations = await read("lib/reading-calculations.ts");
for (const exportName of [
  "datesInRange",
  "getAssignmentTaskCount",
  "getCompletionCount",
  "countAssignmentProgress",
  "getLaunchMinutes",
  "getBookSetupIssues",
]) {
  requireRegex(calculations, new RegExp(`export function ${exportName}\\(`), "lib/reading-calculations.ts", `missing ${exportName} export`);
}

const readingStore = await read("lib/supabase/reading-store.ts");
for (const tableName of ["children", "books", "assignments", "completions", "audio_launches", "manual_logs"]) {
  requireIncludes(readingStore, `.from("${tableName}")`, "lib/supabase/reading-store.ts");
}
requireIncludes(readingStore, "owner_user_id", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "activity_category", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "task_counts", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "count", "lib/supabase/reading-store.ts");

const initMigration = await read("supabase/migrations/20260608213000_init.sql");
for (const tableName of ["profiles", "children", "books", "assignments", "completions", "audio_launches", "manual_logs"]) {
  requireIncludes(initMigration, `alter table public.${tableName} enable row level security`, "supabase/migrations/20260608213000_init.sql");
}
for (const tableName of ["children", "books", "assignments", "completions", "audio_launches", "manual_logs"]) {
  requireRegex(
    initMigration,
    new RegExp(`create policy "[^"]+"\\s+on public\\.${tableName}[\\s\\S]*?auth\\.uid\\(\\) = owner_user_id`, "m"),
    "supabase/migrations/20260608213000_init.sql",
    `missing owner_user_id RLS policy for ${tableName}`,
  );
}
requireIncludes(initMigration, "auth.uid() = id", "supabase/migrations/20260608213000_init.sql");
requireIncludes(initMigration, "activity_category text not null default 'focusListen'", "supabase/migrations/20260608213000_init.sql");

const activityMigration = await read("supabase/migrations/20260610183000_assignment_activity_category_model.sql");
requireIncludes(activityMigration, "activity_category", "supabase/migrations/20260610183000_assignment_activity_category_model.sql");
requireIncludes(activityMigration, "owner_user_id, child_id, date, book_id, activity_category", "supabase/migrations/20260610183000_assignment_activity_category_model.sql");

const clientStats = await stat(path.join(root, "app/reading-manager-client.tsx"));
const maxClientBytes = 120_000;
if (clientStats.size > maxClientBytes) {
  fail(`app/reading-manager-client.tsx is ${clientStats.size} bytes; extract reusable logic before growing past ${maxClientBytes}`);
}

if (failures.length) {
  console.error("Contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Contract check passed");
}
