import { execFileSync } from "node:child_process";

const requestText = process.argv.slice(2).join(" ").trim();

function runGit(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function unique(values) {
  return [...new Set(values)];
}

function anyMatch(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function classifyRequest(text) {
  const normalized = text.toLowerCase();
  const categories = [];

  if (anyMatch(normalized, [/supabase/, /migration/, /\brls\b/, /auth/, /storage/, /postgres/, /database/, /db\b/, /schema/, /로그인/, /인증/, /마이그레이션/, /데이터베이스/])) {
    categories.push("supabase");
  }
  if (anyMatch(normalized, [/\bpwa\b/, /service worker/, /manifest/, /mobile/, /qr/, /camera/, /audio launch/, /browser/, /ui/, /layout/, /모바일/, /화면/, /브라우저/, /오디오/, /카메라/])) {
    categories.push("ui-pwa");
  }
  if (anyMatch(normalized, [/harness/, /workflow/, /script/, /check/, /verify/, /automation/, /scope/, /하네스/, /워크.?플로우/, /스크립트/, /검증/, /자동화/, /범위/, /계획/])) {
    categories.push("harness");
  }
  if (anyMatch(normalized, [/docs?/, /document/, /readme/, /문서/])) {
    categories.push("docs");
  }
  if (!categories.length || anyMatch(normalized, [/feature/, /bug/, /fix/, /refactor/, /reading/, /assignment/, /child/, /book/, /기능/, /수정/, /버그/, /리팩터/, /과제/, /학습/, /아동/, /책/])) {
    categories.push("feature");
  }

  return unique(categories);
}

function classifyFile(file) {
  if (file === "AGENTS.md" || file.startsWith("docs/") || file.startsWith(".agents/")) return "docs";
  if (file.startsWith("plans/")) return "harness";
  if (file.startsWith("supabase/") || file === "lib/supabase/reading-store.ts") return "supabase";
  if (file.startsWith("public/") || file === "styles.css" || file.startsWith("app/")) return "ui-pwa";
  if (file.startsWith("lib/") || file.startsWith("tests/")) return "feature";
  if (file.startsWith("scripts/") || file === "package.json") return "harness";
  return "other";
}

function formatList(values) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- none";
}

const changedFiles = unique([
  ...runGit(["diff", "--name-only", "--diff-filter=ACDMRTUXB", "HEAD"]),
  ...runGit(["ls-files", "--others", "--exclude-standard"]),
]);
const requestCategories = classifyRequest(requestText);
const changedCategories = unique(changedFiles.map(classifyFile));

const skills = [];
if (requestCategories.includes("feature") || changedCategories.includes("feature")) skills.push(".agents/skills/ewd-feature-change");
if (requestCategories.includes("supabase") || changedCategories.includes("supabase")) skills.push(".agents/skills/ewd-supabase-change");
if (requestCategories.includes("ui-pwa") || changedCategories.includes("ui-pwa")) skills.push(".agents/skills/ewd-ui-regression");

const checks = new Set();
if (changedCategories.includes("harness") || changedCategories.includes("docs")) checks.add("npm run check:contracts");
if (changedCategories.includes("feature")) {
  checks.add("npm run check:contracts");
  checks.add("npm run test:unit");
  checks.add("npm run typecheck");
}
if (changedCategories.includes("supabase")) {
  checks.add("npm run check:contracts");
  checks.add("npm run typecheck");
  checks.add("npm run build");
}
if (changedCategories.includes("ui-pwa")) {
  checks.add("npm run check:pwa");
  checks.add("npm run typecheck");
}
if (!checks.size) checks.add("npm run check:contracts");

const warnings = [];
if (!requestText) {
  warnings.push("No request text was provided. Classification is based on changed files only.");
}
if (requestCategories.includes("docs") || requestCategories.includes("harness")) {
  const outOfPlanningChanges = changedFiles.filter((file) => !["docs", "harness"].includes(classifyFile(file)));
  if (outOfPlanningChanges.length) {
    warnings.push("Docs/harness request with code or data changes detected. Confirm scope before editing more code.");
  }
}
if (!requestCategories.includes("supabase") && changedCategories.includes("supabase")) {
  warnings.push("Supabase files changed but the request was not classified as Supabase-related. Confirm scope.");
}
if (!requestCategories.includes("ui-pwa") && changedCategories.includes("ui-pwa")) {
  warnings.push("UI/PWA files changed but the request was not classified as UI/PWA-related. Confirm scope.");
}

console.log("Workflow plan");
console.log("");
console.log("Request categories:");
console.log(formatList(requestCategories));
console.log("");
console.log("Changed file categories:");
console.log(formatList(changedCategories));
console.log("");
console.log("Changed files:");
console.log(formatList(changedFiles));
console.log("");
console.log("Recommended skills:");
console.log(formatList(unique(skills)));
console.log("");
console.log("Recommended checks:");
console.log(formatList([...checks]));
console.log("");
console.log("Scope warnings:");
console.log(formatList(warnings));
