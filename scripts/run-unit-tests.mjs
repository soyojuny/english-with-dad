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

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, ".test-build");
rmSync(output, { recursive: true, force: true });

const compilation = spawnSync(process.execPath, [
  join(root, "node_modules/typescript/bin/tsc"), "-p", join(root, "tsconfig.test.json"),
], { cwd: root, stdio: "inherit" });
if (compilation.error) throw compilation.error;

if (compilation.status !== 0) {
  process.exitCode = compilation.status ?? 1;
} else {
  const directory = join(output, "tests");
  const tests = existsSync(directory) ? findTests(directory).sort() : [];
  if (!tests.length) throw new Error("No emitted unit tests found in .test-build/tests");

  const result = spawnSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
