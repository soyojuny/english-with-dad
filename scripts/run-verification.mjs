import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Fixed suite lists: keep the existing verify command and its build contract intact.
const suites = {
  fast: ["check:contracts", "check:sw", "check:pwa", "test:unit", "test:component", "test:server", "test:harness", "typecheck"],
  all: ["verify", "test:component", "test:server", "test:harness", "test:browser"],
  coverage: ["test:coverage:unit", "test:coverage:component", "test:coverage:server", "check:coverage"],
};
const steps = suites[process.argv[2]];
if (!steps) throw new Error("Expected fast, all, or coverage");
const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env, TZ: "Asia/Seoul" };
delete env.NODE_TEST_CONTEXT;
// npm supplies its own portable CLI path to scripts (including Windows).
if (!env.npm_execpath) throw new Error("Run through npm run verify:fast, verify:all, or test:coverage");
const started = performance.now();
for (const step of steps) {
  const start = performance.now();
  console.log(`[verification] start ${step} TZ=${env.TZ}`);
  const result = spawnSync(process.execPath, [env.npm_execpath, "run", step], {
    cwd: root, env, stdio: "inherit",
  });
  if (result.error) throw result.error;
  console.log(`[verification] end ${step} exit=${result.status ?? 1} seconds=${((performance.now() - start) / 1000).toFixed(2)}`);
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
console.log(`[verification] total seconds=${((performance.now() - started) / 1000).toFixed(2)}`);
