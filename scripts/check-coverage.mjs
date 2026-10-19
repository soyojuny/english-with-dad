import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const normalize = (path) => relative(root, resolve(path)).split(sep).join("/");
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sources(path)
      : /\.(ts|tsx)$/.test(path) && !path.endsWith(".d.ts") && normalize(path) !== "lib/reading-types.ts" ? [normalize(path)] : [];
  });
}
const library = sources(join(root, "lib"));
const application = [...library, ...sources(join(root, "app")), "middleware.ts", "public/sw.js"];
const actual = {};
for (const layer of ["unit", "component", "server"]) {
  const report = JSON.parse(readFileSync(join(root, "coverage", layer, "coverage-final.json"), "utf8"));
  const expected = new Set(layer === "unit" ? library : application);
  const files = {};
  for (const [path, file] of Object.entries(report)) {
    const name = normalize(path);
    assert.ok(expected.has(name), `${layer}: unexpected/non-source report entry ${name}`);
    files[name] = {
      statements: Object.values(file.s).filter((count) => count === 0).length,
      functions: Object.values(file.f).filter((count) => count === 0).length,
      branches: Object.values(file.b).flat().filter((count) => count === 0).length,
    };
  }
  for (const name of expected) assert.ok(files[name], `${layer}: missing source ${name}`);
  actual[layer] = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}
const baselinePath = join(root, "tests/coverage-baseline.json");
if (process.argv[2] === "--record") {
  assert.ok(!existsSync(baselinePath), "Baseline already exists; do not silently replace reviewed evidence");
  writeFileSync(baselinePath, JSON.stringify(actual, null, 2) + "\n");
  console.log("Recorded measured per-file uncovered-count baseline");
} else {
  assert.equal(process.argv.length, 2, "Unknown coverage-check argument");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const layers = ["unit", "component", "server"];
  const metrics = ["branches", "functions", "statements"];
  assert.deepEqual(Object.keys(baseline).sort(), [...layers].sort(), "Invalid baseline layers");
  for (const layer of layers) {
    const files = baseline[layer];
    assert.ok(files && typeof files === "object" && !Array.isArray(files), `Invalid baseline files: ${layer}`);
    for (const name of Object.keys(actual[layer])) {
      assert.ok(Object.hasOwn(files, name), `${layer}: new source ${name}; baseline review required`);
    }
    for (const [name, limits] of Object.entries(files)) {
      assert.deepEqual(Object.keys(limits).sort(), metrics, `Invalid baseline metrics: ${layer} ${name}`);
      for (const value of Object.values(limits)) assert.ok(Number.isInteger(value) && value >= 0, "Invalid baseline count");
      // Removed sources may disappear; new sources require explicit baseline review above.
      if (!actual[layer][name]) continue;
      for (const [metric, limit] of Object.entries(limits)) {
        assert.ok(actual[layer][name][metric] <= limit,
          `${layer} ${name} uncovered ${metric}: ${actual[layer][name][metric]} > baseline ${limit}`);
      }
    }
  }
  console.log("Coverage source inventory and per-file uncovered-count baseline PASS");
}
