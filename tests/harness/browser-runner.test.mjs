import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { authServer, closeServer, listen, startNextServer } from '../browser/support/next-server.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const temporaryRoot = join(repository, 'verification-artifacts/tmp');
mkdirSync(temporaryRoot, { recursive: true });

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

function runProbe(t, source) {
  const directory = mkdtempSync(join(temporaryRoot, 'ewd-browser-probe-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const artifacts = mkdtempSync(join(repository, 'verification-artifacts/browser-probe-'));
  const config = join(directory, 'playwright.config.ts');
  writeFileSync(join(directory, 'new.spec.mjs'), source);
  writeFileSync(config, `import base from ${JSON.stringify(join(repository, 'playwright.config.ts'))};
export default { ...base, outputDir: ${JSON.stringify(join(artifacts, 'results'))},
  reporter: [['list']], projects: [{name:'probe-client', testDir:${JSON.stringify(directory)}}] };
`);
  const env = { ...process.env, TMPDIR: process.env.TMPDIR || temporaryRoot };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [join(repository, 'node_modules/@playwright/test/cli.js'), 'test', '--config', config], {
    cwd: repository, env, encoding: 'utf8', timeout: 90_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return { status: result.status, output: result.stdout + result.stderr, artifacts };
}

const clientImport = `import { test, expect } from ${JSON.stringify(pathToFileURL(join(repository, 'tests/browser/support/client-fixture.mjs')).href)};`;

test('T01-N07: 신규 browser spec은 실제 client fixture와 assertion을 발견하고 실행한다', t => {
  // Given
  const source = `${clientImport}
test('new-browser-discovered', async ({audio:f}) => {
  // Given
  const page = f.page;
  // When
  const completion = page.getByRole('button',{name:'1회 완료',exact:true});
  // Then
  await expect(completion).toBeVisible();
  expect(f.completions).toEqual([]);
});`;

  // When
  const result = runProbe(t, source);

  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /new-browser-discovered/);
  assert.match(result.output, /1 passed/);
});

test('T01-F06: 예상 밖 요청은 catch해도 nonzero이며 trace screenshot 요청 기록이 남는다', t => {
  // Given
  const source = `${clientImport}
test('blocked-network-probe', async ({audio:f}) => {
  // Given
  const url = 'https://unexpected.invalid/probe';
  // When
  await f.page.evaluate(url => fetch(url).catch(() => {}), url);
  // Then: teardown must reject this otherwise passing test.
  expect(f.completions).toEqual([]);
});`;

  // When
  const result = runProbe(t, source);

  // Then
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /blocked-network-probe/);
  assert.match(result.output, /Unexpected browser request/);
  assert.match(result.output, /1 failed/);
  const artifacts = files(result.artifacts);
  assert.ok(artifacts.some(path => path.endsWith('trace.zip')), result.output);
  assert.ok(artifacts.some(path => path.endsWith('.png')), result.output);
  assert.ok(artifacts.some(path => path.endsWith('.json') && readFileSync(path, 'utf8').includes('https://unexpected.invalid/probe')), result.output);
});

test('T01-F07: 실제 Next 포트 시작 실패는 원인과 로그를 남기고 임시파일과 프로세스를 정리한다', async t => {
  // Given
  const occupied = createServer();
  const occupiedOrigin = await listen(occupied);
  const auth = await authServer();
  t.after(async () => { try { await auth.close(); } finally { await closeServer(occupied); } });
  const artifacts = mkdtempSync(join(repository, 'verification-artifacts/next-start-failure-'));

  // When
  const start = () => startNextServer(auth.origin, artifacts, Number(new URL(occupiedOrigin).port));

  // Then
  await assert.rejects(start, /Next startup failed/);
  assert.match(readFileSync(join(artifacts, 'next-server.log'), 'utf8'), /EADDRINUSE/);
  assert.deepEqual(JSON.parse(readFileSync(join(artifacts, 'cleanup.json'), 'utf8')), {
    temporaryDirectoryRemoved: true, processExited: true,
  });
});
