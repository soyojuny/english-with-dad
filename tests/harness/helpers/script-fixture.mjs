import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const repository = fileURLToPath(new URL('../../../', import.meta.url));

export function childEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  for (const key of ['NODE_TEST_CONTEXT', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];
  return env;
}

export function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ewd-script fixture-'));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    assert.equal(existsSync(root), false, 'temporary fixture must be removed');
  });
  return {
    root,
    write(path, source) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), source);
    },
    copy(path) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      cpSync(join(repository, path), join(root, path), { recursive: true });
    },
    read(path) { return readFileSync(join(root, path), 'utf8'); },
    remove(path) { rmSync(join(root, path), { recursive: true, force: true }); },
    has(path) { return existsSync(join(root, path)); },
    run(script, args = [], env = {}) {
      const result = spawnSync(process.execPath, [join(repository, 'scripts', script), ...args], {
        cwd: root, env: childEnv(env), encoding: 'utf8', timeout: 10_000,
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null);
      return { status: result.status, output: result.stdout + result.stderr };
    },
  };
}

// A per-test, exact argv transcript; it implements no git behavior and never delegates to real git.
export function fakeGit(f, responses) {
  const bin = join(f.root, 'fake-bin');
  const script = join(bin, 'git');
  f.write('git-responses.json', JSON.stringify(responses));
  f.write('git-calls.json', '[]');
  f.write('fake-bin/git', `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(__dirname);
const callsFile = path.join(root, 'git-calls.json');
const calls = JSON.parse(fs.readFileSync(callsFile, 'utf8'));
const argv = process.argv.slice(2);
const step = JSON.parse(fs.readFileSync(path.join(root, 'git-responses.json'), 'utf8'))[calls.length];
calls.push(argv);
fs.writeFileSync(callsFile, JSON.stringify(calls));
if (!step || JSON.stringify(argv) !== JSON.stringify(step.args)) {
  console.error('Unexpected fake git argv: ' + JSON.stringify(argv)); process.exit(88);
}
process.stdout.write(step.stdout || '');
process.stderr.write(step.stderr || '');
process.exit(step.status || 0);
`);
  // The executable shim uses the current Node binary; no shell or git hooks are involved.
  chmodSync(script, 0o755);
  return {
    run(name, args = []) {
      const result = f.run(name, args, { PATH: `${bin}${delimiter}${process.env.PATH || ''}` });
      assert.deepEqual(JSON.parse(f.read('git-calls.json')), responses.map(step => step.args), 'exact git argv transcript');
      return result;
    },
  };
}
