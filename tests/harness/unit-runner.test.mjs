import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "ewd-unit-runner "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "lib"));
  for (const path of [
    "scripts/run-unit-tests.mjs", "tsconfig.json", "tsconfig.test.json",
    "lib/reading-calculations.ts", "lib/reading-data.ts", "lib/reading-types.ts",
  ]) copyFileSync(join(repository, path), join(root, path));
  symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "junction");
  return {
    root,
    write(path, source) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), source);
    },
    run() {
      // This subprocess starts an independent runner, outside this node:test worker.
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, [join(root, "scripts/run-unit-tests.mjs")], {
        cwd: root, env, encoding: "utf8", timeout: 30_000,
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null);
      return { status: result.status, output: result.stdout + result.stderr };
    },
  };
}

function passingTest(name, importPath = "../lib/reading-calculations") {
  return `import test from "node:test";
import assert from "node:assert/strict";
import { getLaunchMinutes } from "${importPath}";
test("${name}", () => {
  // Given
  const launch = { openedAt: "2026-10-12T01:00:00.000Z", returnedAt: "2026-10-12T01:02:01.000Z" };
  // When
  const minutes = getLaunchMinutes(launch, 10);
  // Then
  assert.equal(minutes, 3);
});
`;
}

test("T01-N01: 새 루트 단위 테스트를 명령 한 번으로 컴파일하고 발견한다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/new.test.ts", passingTest("new-unit-discovered"));

  // When
  const result = f.run();

  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /new-unit-discovered/);
  assert.ok(existsSync(join(f.root, ".test-build/tests/new.test.js")));
});

test("T01-E01: tests/unit의 중첩 디렉터리 테스트를 발견한다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/unit/domain/nested.test.ts", passingTest("nested-unit-discovered", "../../../lib/reading-calculations"));

  // When
  const result = f.run();

  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /nested-unit-discovered/);
});

test("T01-E02: 소스 테스트를 삭제하면 다음 실행에서 오래된 산출물이 제거된다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/remaining.test.ts", passingTest("remaining-unit"));
  f.write("tests/unit/deleted.test.ts", passingTest("deleted-unit", "../../lib/reading-calculations"));
  const first = f.run();
  assert.equal(first.status, 0, first.output);
  assert.match(first.output, /deleted-unit/);
  assert.ok(existsSync(join(f.root, ".test-build/tests/unit/deleted.test.js")));
  rmSync(join(f.root, "tests/unit/deleted.test.ts"));

  // When
  const second = f.run();

  // Then
  assert.equal(second.status, 0, second.output);
  assert.match(second.output, /remaining-unit/);
  assert.doesNotMatch(second.output, /deleted-unit/);
  assert.equal(existsSync(join(f.root, ".test-build/tests/unit/deleted.test.js")), false);
});

test("T01-E03: 단위 테스트가 0개이면 빈 실행을 성공으로 처리하지 않는다", (t) => {
  // Given
  const f = fixture(t);

  // When
  const result = f.run();

  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /No emitted unit tests found/);
});

test("T01-E05: 마지막 테스트 삭제 후 오래된 성공 산출물로 통과하지 않는다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/last.test.ts", passingTest("last-unit"));
  const first = f.run();
  assert.equal(first.status, 0, first.output);
  rmSync(join(f.root, "tests/last.test.ts"));

  // When
  const result = f.run();

  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /No emitted unit tests found/);
  assert.doesNotMatch(result.output, /ok \d+ - last-unit/);
  assert.equal(existsSync(join(f.root, ".test-build/tests/last.test.js")), false);
});

test("T01-F01: 단위 assertion 실패를 최종 명령의 nonzero exit로 전달한다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/failure.test.ts", `import test from "node:test";
import assert from "node:assert/strict";
test("intentional-assertion-failure", () => {
  // Given
  const actual = 1;
  // When
  const compare = () => assert.equal(actual, 2);
  // Then
  compare();
});
`);

  // When
  const result = f.run();

  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /not ok \d+ - intentional-assertion-failure/);
});

test("T01-F02: 컴파일 오류가 나면 이전 산출물을 실행하거나 부분 emit하지 않는다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/previous.test.ts", passingTest("previous-unit"));
  const first = f.run();
  assert.equal(first.status, 0, first.output);
  f.write("tests/broken.test.ts", "const value: string = 1;\nexport {};\n");

  // When
  const result = f.run();

  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /error TS2322/);
  assert.doesNotMatch(result.output, /previous-unit/);
  assert.equal(existsSync(join(f.root, ".test-build/tests/previous.test.js")), false);
  assert.equal(existsSync(join(f.root, ".test-build/tests/broken.test.js")), false);
});

test("T01-E06: component hook server browser harness 소스는 단위 컴파일과 발견에 섞이지 않는다", (t) => {
  // Given
  const f = fixture(t);
  f.write("tests/only-unit.test.ts", passingTest("only-unit"));
  const otherLayers = [
    "tests/components/component.test.tsx", "tests/hooks/hook.test.tsx", "tests/server/server.test.ts",
    "tests/browser/browser.test.ts", "tests/harness/harness.test.ts",
  ];
  for (const path of otherLayers) f.write(path, "const invalid: string = 1;\nexport {};\n");

  // When
  const result = f.run();

  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /only-unit/);
  for (const layer of ["components", "hooks", "server", "browser", "harness"]) {
    assert.equal(existsSync(join(f.root, ".test-build/tests", layer)), false);
  }
});
