import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [path] : [];
  });
}

const coverage = process.argv.includes("--coverage");
const env = { ...process.env, TZ: "Asia/Seoul" };
delete env.NODE_TEST_CONTEXT;

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, ".test-build");
rmSync(output, { recursive: true, force: true });

const compilation = spawnSync(process.execPath, [
  join(root, "node_modules/typescript/bin/tsc"), "-p", join(root, "tsconfig.test.json"),
], { cwd: root, env, stdio: "inherit" });
if (compilation.error) throw compilation.error;

if (compilation.status !== 0) {
  process.exitCode = compilation.status ?? 1;
} else {
  const directory = join(output, "tests");
  const tests = existsSync(directory) ? findTests(directory).sort() : [];
  if (!tests.length) throw new Error("No emitted unit tests found in .test-build/tests");

  const args = coverage ? [
    join(root, "node_modules/c8/bin/c8.js"), "--all", "--src", join(output, "lib"),
    "--include", "**/lib/**", "--exclude", "**/reading-types.*", "--exclude-after-remap",
    "--reporter", "text", "--reporter", "json", "--reporter", "json-summary", "--reporter", "html",
    "--reports-dir", join(root, "coverage/unit"),
    process.execPath, "--test", ...tests,
  ] : ["--test", ...tests];
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
