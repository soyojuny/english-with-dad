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
  ".agents/skills/ewd-git-publish/SKILL.md",
  ".agents/skills/ewd-supabase-change/SKILL.md",
  ".agents/skills/ewd-ui-regression/SKILL.md",
  ".agents/skills/grill-with-docs/SKILL.md",
  ".agents/skills/grilling/SKILL.md",
  ".agents/skills/domain-modeling/SKILL.md",
  ".agents/skills/domain-modeling/CONTEXT-FORMAT.md",
  ".agents/skills/domain-modeling/ADR-FORMAT.md",
  ".agents/skills/implement/SKILL.md",
  ".agents/skills/code-review/SKILL.md",
  ".agents/skills/research/SKILL.md",
  "docs/development-harness.md",
  "plans/README.md",
  "plans/active/.gitkeep",
  "plans/archive/.gitkeep",
  "docs/supabase-region-migration.md",
  "scripts/git-publish.mjs",
  "scripts/plan-workflow.mjs",
  "lib/reading-calculations.ts",
  "lib/reading-types.ts",
  "lib/reading-data.ts",
  "lib/supabase/reading-store.ts",
  "tests/reading-calculations.test.ts",
  "tsconfig.test.json",
  "supabase/migrations/20260608213000_init.sql",
  "supabase/migrations/20260615210000_word_reading_extra_study.sql",
  "supabase/migrations/20260621190000_assignment_quiz_score.sql",
  "supabase/migrations/20260621200000_assignment_quiz_enabled.sql",
  "supabase/migrations/20260624090000_assignment_quiz_result_text.sql",
  "supabase/migrations/20260624093000_assignment_quiz_only_tasks.sql",
  "supabase/migrations/20260621210000_anonymous_local_test_profiles.sql",
  "supabase/migrations/20260711120000_copywork_extra_study.sql",
]) {
  await requireFile(relativePath);
}

const packageJson = JSON.parse(await read("package.json"));
for (const scriptName of ["plan:workflow", "git:status", "git:commit", "git:push", "git:publish", "check:contracts", "check:sw", "check:pwa", "test:unit", "typecheck", "build", "verify"]) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json scripts must define ${scriptName}`);
  }
}

const agentsGuide = await read("AGENTS.md");
for (const requiredText of [
  "grill-with-docs",
  "plans/active/<slug>/",
  "plan.md",
  "review.md",
  "plans/archive/",
]) {
  requireIncludes(agentsGuide, requiredText, "AGENTS.md");
}

const plansReadme = await read("plans/README.md");
for (const requiredText of [
  "plan.md",
  "review.md",
  "tasks/",
  "grill-with-docs",
  "code-review",
  "docs/CONTEXT.md",
  "docs/adr/",
  "plans/archive/",
  "Promotion Candidates",
]) {
  requireIncludes(plansReadme, requiredText, "plans/README.md");
}

const developmentHarness = await read("docs/development-harness.md");
for (const requiredText of [
  "plans/",
  "plans/active/<slug>/plan.md",
  "verification agent",
  "plan-aware `code-review`",
  "review.md",
  "docs/adr/",
]) {
  requireIncludes(developmentHarness, requiredText, "docs/development-harness.md");
}

const codeReviewSkill = await read(".agents/skills/code-review/SKILL.md");
for (const requiredText of [
  "plans/active/<slug>/",
  "plan.md",
  "tasks/*.md",
  "review.md",
]) {
  requireIncludes(codeReviewSkill, requiredText, ".agents/skills/code-review/SKILL.md");
}

const regionMigrationGuide = await read("docs/supabase-region-migration.md");
for (const requiredText of [
  "ap-northeast-2",
  "supabase db dump",
  "session_replication_role = replica",
  "auth.users",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]) {
  requireIncludes(regionMigrationGuide, requiredText, "docs/supabase-region-migration.md");
}

const authPanel = await read("app/auth-panel.tsx");
requireIncludes(authPanel, "signInAnonymously", "app/auth-panel.tsx");
requireIncludes(authPanel, "isLocalTestLoginEnabled", "app/auth-panel.tsx");

const supabaseConfig = await read("lib/supabase/config.ts");
requireIncludes(supabaseConfig, 'process.env.NODE_ENV === "development"', "lib/supabase/config.ts");
requireIncludes(supabaseConfig, "NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN", "lib/supabase/config.ts");

const gitignore = await read(".gitignore");
for (const ignoredLegacyPath of ["/app.js", "/index.html", "/manifest.webmanifest", "/sw.js"]) {
  requireIncludes(gitignore, ignoredLegacyPath, ".gitignore");
}

const types = await read("lib/reading-types.ts");
requireUnionMembers(types, "TaskType", ["listen", "shadow", "self", "wordRead", "copywork"], "lib/reading-types.ts");
requireUnionMembers(
  types,
  "ActivityCategory",
  ["focusListen", "readAloud", "englishPicture", "extraStudy"],
  "lib/reading-types.ts",
);
requireUnionMembers(
  types,
  "BookContentType",
  ["book", "wordReading"],
  "lib/reading-types.ts",
);
requireUnionMembers(
  types,
  "ManualLogType",
  ["dvd", "passiveListen", "korean", "englishPicture", "extraStudy"],
  "lib/reading-types.ts",
);

const data = await read("lib/reading-data.ts");
for (const key of ["listen", "shadow", "self", "wordRead", "copywork"]) {
  requireRegex(data, new RegExp(`${key}: \\{ label:`), "lib/reading-data.ts", `missing task definition for ${key}`);
}
for (const key of ["focusListen", "readAloud", "englishPicture", "extraStudy"]) {
  requireRegex(
    data,
    new RegExp(`${key}: \\{ label:`),
    "lib/reading-data.ts",
    `missing activity category definition for ${key}`,
  );
}
for (const key of ["dvd", "passiveListen", "listen", "shadow", "self", "wordRead", "copywork", "korean", "englishPicture", "extraStudy"]) {
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
  "getActivityTasksForMaterial",
]) {
  requireRegex(calculations, new RegExp(`export function ${exportName}\\(`), "lib/reading-calculations.ts", `missing ${exportName} export`);
}

const readingStore = await read("lib/supabase/reading-store.ts");
for (const tableName of ["children", "books", "assignments", "completions", "audio_launches", "manual_logs"]) {
  requireIncludes(readingStore, `.from("${tableName}")`, "lib/supabase/reading-store.ts");
}
requireIncludes(readingStore, "owner_user_id", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "content_type", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "activity_category", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "task_counts", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "quiz_score", "lib/supabase/reading-store.ts");
requireIncludes(readingStore, "quiz_enabled", "lib/supabase/reading-store.ts");
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
requireIncludes(initMigration, "content_type text not null default 'book'", "supabase/migrations/20260608213000_init.sql");
requireIncludes(initMigration, "activity_category text not null default 'focusListen'", "supabase/migrations/20260608213000_init.sql");
requireIncludes(initMigration, "wordRead", "supabase/migrations/20260608213000_init.sql");

const activityMigration = await read("supabase/migrations/20260610183000_assignment_activity_category_model.sql");
requireIncludes(activityMigration, "activity_category", "supabase/migrations/20260610183000_assignment_activity_category_model.sql");
requireIncludes(activityMigration, "owner_user_id, child_id, date, book_id, activity_category", "supabase/migrations/20260610183000_assignment_activity_category_model.sql");

const wordReadingMigration = await read("supabase/migrations/20260615210000_word_reading_extra_study.sql");
requireIncludes(wordReadingMigration, "content_type", "supabase/migrations/20260615210000_word_reading_extra_study.sql");
requireIncludes(wordReadingMigration, "wordRead", "supabase/migrations/20260615210000_word_reading_extra_study.sql");
requireIncludes(wordReadingMigration, "extraStudy", "supabase/migrations/20260615210000_word_reading_extra_study.sql");

const quizScoreMigration = await read("supabase/migrations/20260621190000_assignment_quiz_score.sql");
requireIncludes(quizScoreMigration, "quiz_score", "supabase/migrations/20260621190000_assignment_quiz_score.sql");
requireIncludes(quizScoreMigration, "between 0 and 100", "supabase/migrations/20260621190000_assignment_quiz_score.sql");

const quizEnabledMigration = await read("supabase/migrations/20260621200000_assignment_quiz_enabled.sql");
requireIncludes(quizEnabledMigration, "quiz_enabled", "supabase/migrations/20260621200000_assignment_quiz_enabled.sql");
requireIncludes(quizEnabledMigration, "default false", "supabase/migrations/20260621200000_assignment_quiz_enabled.sql");

const quizResultTextMigration = await read("supabase/migrations/20260624090000_assignment_quiz_result_text.sql");
requireIncludes(quizResultTextMigration, "alter column quiz_score type text", "supabase/migrations/20260624090000_assignment_quiz_result_text.sql");
requireIncludes(quizResultTextMigration, "assignments_quiz_score_text_check", "supabase/migrations/20260624090000_assignment_quiz_result_text.sql");

const quizPassFailMigration = await read("supabase/migrations/20260627120000_assignment_quiz_pass_fail.sql");
requireIncludes(quizPassFailMigration, "assignments_quiz_score_pass_fail_check", "supabase/migrations/20260627120000_assignment_quiz_pass_fail.sql");
requireIncludes(quizPassFailMigration, "quiz_score in ('PASS', 'FAIL')", "supabase/migrations/20260627120000_assignment_quiz_pass_fail.sql");

const quizOnlyTasksMigration = await read("supabase/migrations/20260624093000_assignment_quiz_only_tasks.sql");
requireIncludes(quizOnlyTasksMigration, "or quiz_enabled", "supabase/migrations/20260624093000_assignment_quiz_only_tasks.sql");
requireIncludes(quizOnlyTasksMigration, "assignments_tasks_check", "supabase/migrations/20260624093000_assignment_quiz_only_tasks.sql");

const copyworkMigration = await read("supabase/migrations/20260711120000_copywork_extra_study.sql");
for (const requiredText of [
  "copywork",
  "assignments_tasks_check",
  "assignments_task_counts_check",
  "completions_task_type_check",
  "audio_launches_task_type_check",
]) {
  requireIncludes(copyworkMigration, requiredText, "supabase/migrations/20260711120000_copywork_extra_study.sql");
}

const anonymousProfileMigration = await read("supabase/migrations/20260621210000_anonymous_local_test_profiles.sql");
requireIncludes(anonymousProfileMigration, "anonymous+", "supabase/migrations/20260621210000_anonymous_local_test_profiles.sql");
requireIncludes(
  anonymousProfileMigration,
  "revoke execute on function public.handle_new_user() from public, anon, authenticated",
  "supabase/migrations/20260621210000_anonymous_local_test_profiles.sql",
);

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
