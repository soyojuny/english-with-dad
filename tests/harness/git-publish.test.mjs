import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { childEnv, fakeGit, fixture } from './helpers/script-fixture.mjs';

const branch = ['branch', '--show-current'];
const upstream = ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'];
const status = ['status', '--porcelain'];
const origin = ['remote', 'get-url', 'origin'];
const step = (args, stdout = '', code = 0) => ({ args, stdout, status: code });

test('T07-N01: 기본 status는 fake branch/upstream/변경 목록을 표시한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [step(branch, 'main\n'), step(upstream, 'origin/main\n'), step(status, ' M note.md\n?? new.txt\n')]);
  // When
  const result = git.run('git-publish.mjs');
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Branch: main/);
  assert.match(result.output, /Upstream: origin\/main/);
  assert.match(result.output, /- M note.md\n- \?\? new.txt/);
});

test('T07-N02: 실제 git은 remote 없는 임시 unborn repo의 status만 읽는다', t => {
  // Given: no commit, hooks, origin or push; never use this repository as cwd.
  const f = fixture(t);
  const init = spawnSync('git', ['init', '--initial-branch=fixture-branch', f.root], {
    cwd: f.root, env: childEnv({ GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }),
    encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(init.error);
  assert.equal(init.status, 0, init.stderr);
  f.write('untracked.txt', 'local fixture only\n');
  // When
  const result = f.run('git-publish.mjs', ['status']);
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Branch: fixture-branch/);
  assert.match(result.output, /Upstream: none/);
  assert.match(result.output, /\?\? untracked.txt/);
  assert.equal(f.has('.git/refs/heads/fixture-branch'), false, 'no actual commit created');
  assert.doesNotMatch(f.read('.git/config'), /\[remote /);
});

test('T07-N03: commit 메시지는 공백·한국어·메타문자를 shell 없이 단일 argv로 보낸다', t => {
  // Given
  const f = fixture(t);
  const message = 'fix: 한국어 "quote" $() `literal`';
  const git = fakeGit(f, [step(status, ' M input.txt\n'), step(['add', '-A']), step(['commit', '-m', message])]);
  // When
  const result = git.run('git-publish.mjs', ['commit', 'fix:', '한국어', '"quote"', '$()', '`literal`']);
  // Then
  assert.equal(result.status, 0, result.output);
  assert.equal(f.has('.git'), false, 'fake commit must not create a real repository');
});

test('T07-E01: 변경 없는 commit은 add/commit을 호출하지 않는다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [step(status)]);
  // When
  const result = git.run('git-publish.mjs', ['commit', 'message']);
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /No changes to commit/);
});

test('T07-F01: 빈 commit 메시지는 git 호출 전에 거부한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, []);
  // When
  const result = git.run('git-publish.mjs', ['commit', '   ']);
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Commit message is required/);
});

test('T07-N04: upstream이 있으면 대상 인자를 추가하지 않고 fake push한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [step(branch, 'main\n'), step(upstream, 'origin/main\n'), step(['push'])]);
  // When
  const result = git.run('git-publish.mjs', ['push']);
  // Then
  assert.equal(result.status, 0, result.output);
  assert.equal(f.has('.git'), false);
});

test('T07-E02: upstream이 없으면 origin/current branch로 fake push -u한다', t => {
  // Given: this URL is text returned by the shim; no real git process receives it.
  const f = fixture(t);
  const git = fakeGit(f, [step(branch, 'fixture-branch\n'), step(upstream, '', 1),
    step(origin, 'https://never-contact.invalid/repo.git\n'), step(['push', '-u', 'origin', 'fixture-branch'])]);
  // When
  const result = git.run('git-publish.mjs', ['push']);
  // Then
  assert.equal(result.status, 0, result.output);
});

test('T07-F02: detached HEAD는 push 대상 추측 전에 거부한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [step(branch)]);
  // When
  const result = git.run('git-publish.mjs', ['push']);
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Refusing to push from detached HEAD/);
});

test('T07-F03: upstream/origin이 없으면 push하지 않는다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [step(branch, 'main\n'), step(upstream, '', 1), step(origin, '', 1)]);
  // When
  const result = git.run('git-publish.mjs', ['push']);
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /No origin remote configured/);
});

for (const changed of [false, true]) {
  test(`T07-N05: publish는 ${changed ? 'fake commit 뒤' : '변경 없어 commit 없이'} fake push한다`, t => {
    // Given
    const f = fixture(t);
    const responses = [step(status, changed ? ' M input.txt\n' : '')];
    if (changed) responses.push(step(['add', '-A']), step(['commit', '-m', 'publish message']));
    responses.push(step(branch, 'main\n'), step(upstream, 'origin/main\n'), step(['push']));
    const git = fakeGit(f, responses);
    // When
    const result = git.run('git-publish.mjs', ['publish', 'publish message']);
    // Then
    assert.equal(result.status, 0, result.output);
    if (!changed) assert.match(result.output, /No changes to commit/);
  });
}

for (const failed of ['add', 'commit', 'push']) {
  test(`T07-F04: ${failed} 실행 실패는 nonzero로 전달되고 다음 단계를 실행하지 않는다`, t => {
    // Given
    const f = fixture(t);
    const responses = [];
    if (failed === 'push') responses.push(step(branch, 'main\n'), step(upstream, 'origin/main\n'));
    else {
      responses.push(step(status, ' M input.txt\n'));
      if (failed === 'commit') responses.push(step(['add', '-A']));
    }
    const args = failed === 'add' ? ['add', '-A'] : failed === 'commit' ? ['commit', '-m', 'message'] : ['push'];
    responses.push({ args, status: 23, stderr: `fixture ${failed} failed\n` });
    const git = fakeGit(f, responses);
    // When
    const result = git.run('git-publish.mjs', [failed === 'push' ? 'push' : 'publish', 'message']);
    // Then
    assert.notEqual(result.status, 0, result.output);
    assert.ok(result.output.includes(`fixture ${failed} failed`), result.output);
  });
}

test('T07-F05: 알 수 없는 명령은 git을 실행하지 않고 usage와 실패를 반환한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, []);
  // When
  const result = git.run('git-publish.mjs', ['unknown']);
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Unknown command "unknown"/);
});
