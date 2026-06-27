import { execFileSync } from "node:child_process";

const command = process.argv[2] ?? "status";
const message = process.argv.slice(3).join(" ").trim();

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });
}

function tryGit(args) {
  try {
    return runGit(args).trim();
  } catch {
    return "";
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function currentBranch() {
  const branch = tryGit(["branch", "--show-current"]);
  if (!branch) fail("No current branch found. Refusing to push from detached HEAD.");
  return branch;
}

function changedFiles() {
  return tryGit(["status", "--porcelain"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function printStatus() {
  const branch = currentBranch();
  const upstream = tryGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const changes = changedFiles();

  console.log(`Branch: ${branch}`);
  console.log(`Upstream: ${upstream || "none"}`);
  console.log("");
  console.log("Changes:");
  console.log(changes.length ? changes.map((line) => `- ${line}`).join("\n") : "- none");
}

function commitChanges() {
  if (!message) fail('Commit message is required. Example: npm run git:commit -- "your message"');

  const changes = changedFiles();
  if (!changes.length) {
    console.log("No changes to commit.");
    return false;
  }

  runGit(["add", "-A"], { inherit: true });
  runGit(["commit", "-m", message], { inherit: true });
  return true;
}

function pushBranch() {
  const branch = currentBranch();
  const upstream = tryGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);

  if (upstream) {
    runGit(["push"], { inherit: true });
    return;
  }

  const origin = tryGit(["remote", "get-url", "origin"]);
  if (!origin) fail("No origin remote configured. Refusing to guess a push target.");

  runGit(["push", "-u", "origin", branch], { inherit: true });
}

switch (command) {
  case "status":
    printStatus();
    break;
  case "commit":
    commitChanges();
    break;
  case "push":
    pushBranch();
    break;
  case "publish":
    commitChanges();
    pushBranch();
    break;
  default:
    fail(`Unknown command "${command}". Use status, commit, push, or publish.`);
}
