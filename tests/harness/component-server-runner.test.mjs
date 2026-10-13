import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));

function probe(t, environment, source) {
  const directory = mkdtempSync(join(tmpdir(), "ewd-vitest-probe-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "probe.test.ts");
  const config = join(directory, "vitest.config.ts");
  writeFileSync(path, source);
  writeFileSync(config, `import base from ${JSON.stringify(join(repository, `vitest.${environment}.config.ts`))};
export default { ...base, test: { ...base.test, include: [${JSON.stringify(relative(repository, path))}] } };
`);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [join(repository, "node_modules/vitest/vitest.mjs"), "run", "--config", config], {
    cwd: repository, env, encoding: "utf8", timeout: 30_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return { status: result.status, output: result.stdout + result.stderr };
}

test("T01-F04: 잡아낸 예상 밖 fetch도 실제 test 실패와 nonzero exit로 전달한다", (t) => {
  // Given
  const source = `import { expect, test } from "vitest";
test("caught-network-probe", async () => {
  // Given
  const url = "https://unexpected.invalid/probe";
  // When
  await fetch(url).catch(() => {});
  // Then: shared teardown must reject this otherwise passing assertion.
  expect(true).toBe(true);
});`;

  // When
  const result = probe(t, "component", source);

  // Then
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /caught-network-probe/);
  assert.match(result.output, /Unexpected fetch/);
  assert.match(result.output, /Tests\s+1 failed/);
});

test("T01-F05: Node suite에서 DOM hook을 실행하면 환경 원인과 nonzero exit가 나타난다", (t) => {
  // Given
  const source = `import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
test("wrong-environment-probe", () => {
  // Given
  const hook = () => "fixture";
  // When
  const view = renderHook(hook);
  // Then
  expect(view.result.current).toBe("fixture");
});`;

  // When
  const result = probe(t, "server", source);

  // Then
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /wrong-environment-probe/);
  assert.match(result.output, /document is not defined/);
  assert.match(result.output, /Tests\s+1 failed/);
});
