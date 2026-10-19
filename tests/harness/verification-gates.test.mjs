import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture, childEnv } from './helpers/script-fixture.mjs';

const plans = {
  fast: ['check:contracts', 'check:sw', 'check:pwa', 'test:unit', 'test:component', 'test:server', 'test:harness', 'typecheck'],
  all: ['verify', 'test:component', 'test:server', 'test:harness', 'test:browser'],
  coverage: ['test:coverage:unit', 'test:coverage:component', 'test:coverage:server', 'check:coverage'],
};
function gateFixture(t) {
  const f = fixture(t);
  f.copy('scripts/run-verification.mjs');
  f.write('calls.json', '[]');
  // Exact npm CLI boundary only; never runs repo suites, builds or network calls.
  f.write('npm-cli.cjs', `const fs = require('node:fs');
const calls = JSON.parse(fs.readFileSync('calls.json', 'utf8'));
if (process.argv[2] !== 'run' || process.env.TZ !== 'Asia/Seoul' || process.env.NODE_TEST_CONTEXT) process.exit(91);
calls.push(process.argv[3]); fs.writeFileSync('calls.json', JSON.stringify(calls));
process.exit(process.argv[3] === process.env.FAIL_STEP ? 23 : 0);
`);
  return {
    ...f,
    invoke(mode, overrides = {}) {
      const result = spawnSync(process.execPath, [join(f.root, 'scripts/run-verification.mjs'), mode], {
        cwd: f.root, encoding: 'utf8', timeout: 10000,
        env: { ...childEnv(), NODE_TEST_CONTEXT: 'inherited-probe', TZ: 'UTC', npm_execpath: join(f.root, 'npm-cli.cjs'), ...overrides },
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null);
      return { status: result.status, output: result.stdout + result.stderr };
    },
  };
}
for (const [mode, expected] of Object.entries(plans)) {
  test(`T08-N01 ${mode}: 고정 suite를 순서대로 실행하고 TZ와 child test 환경을 격리한다`, (t) => {
    // Given
    const f = gateFixture(t);
    // When
    const result = f.invoke(mode);
    // Then
    assert.equal(result.status, 0, result.output);
    assert.deepEqual(JSON.parse(f.read('calls.json')), expected);
    assert.match(result.output, /total seconds=/);
  });
}
test('T08-F01: 중간 suite 실패 exit를 전달하고 뒤의 suite는 실행하지 않는다', (t) => {
  // Given
  const f = gateFixture(t);
  // When
  const result = f.invoke('all', { FAIL_STEP: 'test:server' });
  // Then
  assert.equal(result.status, 23, result.output);
  assert.deepEqual(JSON.parse(f.read('calls.json')), ['verify', 'test:component', 'test:server']);
});
test('T08-F02: 알 수 없는 mode는 어떤 suite도 실행하지 않는다', (t) => {
  // Given
  const f = gateFixture(t);
  // When
  const result = f.invoke('unknown');
  // Then
  assert.notEqual(result.status, 0);
  assert.deepEqual(JSON.parse(f.read('calls.json')), []);
});

function coverageFixture(t) {
  const f = fixture(t);
  f.write('lib/unimported.ts', 'export const unused = () => 1;\n');
  f.write('lib/reading-types.ts', 'export type Excluded = string;\n');
  f.write('app/page.tsx', 'export default function Page() { return null; }\n');
  f.write('middleware.ts', 'export function middleware() {}\n');
  f.write('public/sw.js', 'self.addEventListener(\"fetch\", () => {});\n');
  const report = (names) => Object.fromEntries(names.map(name => [join(f.root, name), {
    s: { 0: 0 }, f: { 0: 0 }, b: { 0: [0, 0] },
  }]));
  const baseline = {};
  for (const layer of ['unit', 'component', 'server']) {
    const names = layer === 'unit' ? ['lib/unimported.ts'] : ['lib/unimported.ts', 'app/page.tsx', 'middleware.ts', 'public/sw.js'];
    f.write(`coverage/${layer}/coverage-final.json`, JSON.stringify(report(names)));
    baseline[layer] = Object.fromEntries(names.map(name => [name, { statements: 1, functions: 1, branches: 2 }]));
  }
  f.write('tests/coverage-baseline.json', JSON.stringify(baseline));
  return f;
}
test('T08-E01: 미import 원본의 0 hit와 타입 전용 제외를 허용하며 source inventory를 확인한다', (t) => {
  // Given
  const f = coverageFixture(t);
  // When
  const result = f.run('check-coverage.mjs');
  // Then
  assert.equal(result.status, 0, result.output);
});
test('T08-F03: 새 runtime source가 보고서에 빠지면 성공으로 처리하지 않는다', (t) => {
  // Given
  const f = coverageFixture(t);
  f.write('lib/new-file.ts', 'export const newlyDiscovered = 1;\n');
  // When
  const result = f.run('check-coverage.mjs');
  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /missing source lib\/new-file.ts/);
});
test('T08-F04: 측정 baseline보다 미실행 branch가 늘면 거부한다', (t) => {
  // Given
  const f = coverageFixture(t);
  const baseline = JSON.parse(f.read('tests/coverage-baseline.json'));
  baseline.unit['lib/unimported.ts'].branches = 1;
  f.write('tests/coverage-baseline.json', JSON.stringify(baseline));
  // When
  const result = f.run('check-coverage.mjs');
  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /uncovered branches: 2 > baseline 1/);
});
test('T08-F05: 기존 baseline은 record 명령으로 조용히 덮어쓰지 않는다', (t) => {
  // Given
  const f = coverageFixture(t);
  const before = f.read('tests/coverage-baseline.json');
  // When
  const result = f.run('check-coverage.mjs', ['--record']);
  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /Baseline already exists/);
  assert.equal(f.read('tests/coverage-baseline.json'), before);
});

test('T08-E02: 보고서에 0 hit로 발견된 새 source도 baseline 검토 없이는 통과하지 않는다', (t) => {
  // Given
  const f = coverageFixture(t);
  const baseline = JSON.parse(f.read('tests/coverage-baseline.json'));
  delete baseline.unit['lib/unimported.ts'];
  f.write('tests/coverage-baseline.json', JSON.stringify(baseline));
  // When
  const result = f.run('check-coverage.mjs');
  // Then
  assert.notEqual(result.status, 0);
  assert.match(result.output, /new source lib\/unimported.ts; baseline review required/);
});
for (const invalid of ['layer', 'metric']) {
  test(`T08-F06 ${invalid}: baseline 키 누락을 거부한다`, (t) => {
    // Given
    const f = coverageFixture(t);
    const baseline = JSON.parse(f.read('tests/coverage-baseline.json'));
    if (invalid === 'layer') delete baseline.server;
    else delete baseline.unit['lib/unimported.ts'].branches;
    f.write('tests/coverage-baseline.json', JSON.stringify(baseline));
    // When
    const result = f.run('check-coverage.mjs');
    // Then
    assert.notEqual(result.status, 0);
    assert.match(result.output, /Invalid baseline/);
  });
}
