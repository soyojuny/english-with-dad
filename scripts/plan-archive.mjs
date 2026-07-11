import { cp, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rawTarget = process.argv[2]?.trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function toRepoPath(...parts) {
  return path.join(root, ...parts);
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeSlug(input) {
  if (!input) {
    fail('Plan slug is required. Example: npm run plan:archive -- "my-plan-slug"');
  }

  const normalized = input.replace(/\\/g, "/").replace(/\/+$/, "");
  const withoutPrefix = normalized
    .replace(/^\.?\/*plans\/active\//, "")
    .replace(/^\.?\/*plans\/archive\//, "");

  if (!withoutPrefix || withoutPrefix.includes("/")) {
    fail(`Expected a single plan slug, got "${input}".`);
  }

  return withoutPrefix;
}

async function requirePlanShape(activePath) {
  for (const relativePath of ["plan.md", "review.md", "tasks"]) {
    const absolutePath = path.join(activePath, relativePath);
    if (!(await exists(absolutePath))) {
      fail(`Active plan is missing required path: ${path.relative(root, absolutePath)}`);
    }
  }
}

async function readReviewStatus(reviewPath) {
  const content = await readFile(reviewPath, "utf8");
  const lines = content.split(/\r?\n/);
  const statusHeadingIndex = lines.findIndex((line) => line.trim() === "## Status");

  if (statusHeadingIndex === -1) {
    fail(`Review file is missing a ## Status section: ${path.relative(root, reviewPath)}`);
  }

  const statusLine = lines.slice(statusHeadingIndex + 1).find((line) => line.trim().length > 0)?.trim();
  if (!statusLine) {
    fail(`Review file is missing a status value under ## Status: ${path.relative(root, reviewPath)}`);
  }

  return statusLine;
}

function isPassingStatus(status) {
  return ["pass", "passed", "complete"].includes(status.toLowerCase());
}

async function movePlanDirectory(sourcePath, destinationPath) {
  await mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    await rename(sourcePath, destinationPath);
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }

    await cp(sourcePath, destinationPath, { recursive: true, force: false, errorOnExist: true });
    await rm(sourcePath, { recursive: true, force: false });
  }
}

const slug = normalizeSlug(rawTarget);
const activePath = toRepoPath("plans", "active", slug);
const archivePath = toRepoPath("plans", "archive", slug);
const activeExists = await exists(activePath);
const archiveExists = await exists(archivePath);

if (archiveExists && !activeExists) {
  console.log(`Plan already archived: plans/archive/${slug}`);
  process.exit(0);
}

if (!activeExists) {
  fail(`Active plan not found: plans/active/${slug}`);
}

if (archiveExists) {
  fail(`Archive target already exists: plans/archive/${slug}`);
}

await requirePlanShape(activePath);

const reviewStatus = await readReviewStatus(path.join(activePath, "review.md"));
if (!isPassingStatus(reviewStatus)) {
  fail(`Refusing to archive plans/active/${slug} because review status is "${reviewStatus}".`);
}

await movePlanDirectory(activePath, archivePath);
console.log(`Archived plan: plans/active/${slug} -> plans/archive/${slug}`);
