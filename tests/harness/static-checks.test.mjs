import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/script-fixture.mjs';

function contracts(t) {
  const f = fixture(t);
  for (const path of ['AGENTS.md', '.agents/skills', 'docs/development-harness.md', 'docs/supabase-region-migration.md',
    'plans/README.md', 'plans/active/.gitkeep', 'plans/archive/.gitkeep', 'package.json', '.gitignore',
    'scripts', 'lib/reading-calculations.ts', 'lib/reading-types.ts', 'lib/reading-data.ts',
    'lib/supabase/reading-store.ts', 'lib/supabase/config.ts', 'app/auth-panel.tsx', 'app/reading-manager-client.tsx',
    'tests/reading-calculations.test.ts', 'tsconfig.test.json', 'supabase/migrations']) f.copy(path);
  return f;
}

function pwa(t) {
  const f = fixture(t);
  for (const path of ['public/sw.js', 'public/manifest.webmanifest', 'public/assets/app-icon.svg',
    'public/assets/app-icon-192.png', 'public/assets/app-icon-512.png',
    'public/assets/covers/berenstain-doctor.jpg', 'public/assets/covers/bones.jpg',
    'public/assets/covers/monthly-filled.jpg']) f.copy(path);
  return f;
}

function updateManifest(f, update) {
  const manifest = JSON.parse(f.read('public/manifest.webmanifest'));
  update(manifest);
  f.write('public/manifest.webmanifest', JSON.stringify(manifest));
}

test('T03-N01: cwd의 정상 contracts fixture는 통과한다', t => {
  // Given
  const f = contracts(t);
  // When
  const result = f.run('check-contracts.mjs');
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Contract check passed/);
});

test('T03-E01: 필수 skill 누락은 이름과 nonzero exit로 전달된다', t => {
  // Given
  const f = contracts(t);
  f.remove('.agents/skills/research/SKILL.md');
  // When
  const result = f.run('check-contracts.mjs');
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Missing required file: \.agents\/skills\/research\/SKILL.md/);
});

test('T03-F01: script와 type 계약 위반을 한 실행에서 함께 보고한다', t => {
  // Given
  const f = contracts(t);
  const pkg = JSON.parse(f.read('package.json'));
  delete pkg.scripts.verify;
  f.write('package.json', JSON.stringify(pkg));
  f.write('lib/reading-types.ts', f.read('lib/reading-types.ts').replace(' | "copywork"', ''));
  // When
  const result = f.run('check-contracts.mjs');
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /scripts must define verify/);
  assert.match(result.output, /TaskType must include "copywork"/);
});

for (const [size, status] of [[120_000, 0], [120_001, 1]]) {
  test(`T03-E02: client shell ${size} byte는 budget 경계에서 exit ${status}다`, t => {
    // Given: this gate checks bytes, not whether the client compiles.
    const f = contracts(t);
    f.write('app/reading-manager-client.tsx', Buffer.alloc(size, 'x'));
    // When
    const result = f.run('check-contracts.mjs');
    // Then
    assert.equal(result.status, status, result.output);
    assert.match(result.output, status ? /client shell budget is 120000/ : /Contract check passed/);
  });
}

for (const missing of [false, true]) {
  test(`T03-F02: package.json ${missing ? '누락' : 'JSON 손상'}은 성공으로 숨기지 않는다`, t => {
    // Given
    const f = contracts(t);
    if (missing) f.remove('package.json'); else f.write('package.json', '{');
    // When
    const result = f.run('check-contracts.mjs');
    // Then
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, missing ? /ENOENT.*package.json/s : /SyntaxError/);
    assert.doesNotMatch(result.output, /Contract check passed/);
  });
}

test('T04-N01: cwd의 manifest/icon/cache target fixture는 통과한다', t => {
  // Given
  const f = pwa(t);
  // When
  const result = f.run('check-pwa.mjs');
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /PWA check passed/);
});

for (const [field, value] of [['start_url', '/other'], ['scope', '/other'], ['display', 'browser']]) {
  test(`T04-F01: manifest ${field} 위반은 명시 거부한다`, t => {
    // Given
    const f = pwa(t);
    updateManifest(f, manifest => { manifest[field] = value; });
    // When
    const result = f.run('check-pwa.mjs');
    // Then
    assert.equal(result.status, 1, result.output);
    assert.ok(result.output.includes(`manifest.${field} must be`), result.output);
  });
}

for (const [name, icons, message] of [
  ['빈 icon 목록', [], /must define install icons/],
  ['한 개 icon', [{ src: 'assets/app-icon.svg' }], /must define install icons/],
  ['src 누락', [{}, { src: 'assets/app-icon.svg' }], /icon is missing src/],
]) {
  test(`T04-E01: ${name}은 설치 icon 계약 실패다`, t => {
    // Given
    const f = pwa(t);
    updateManifest(f, manifest => { manifest.icons = icons; });
    // When
    const result = f.run('check-pwa.mjs');
    // Then
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, message);
  });
}

for (const [path, message] of [
  ['public/assets/app-icon-192.png', /manifest icon is missing on disk: assets\/app-icon-192.png/],
  ['public/assets/covers/bones.jpg', /cache target is missing on disk: \/assets\/covers\/bones.jpg/],
]) {
  test(`T04-E02: 참조 자산 ${path} 누락을 발견한다`, t => {
    // Given
    const f = pwa(t);
    f.remove(path);
    // When
    const result = f.run('check-pwa.mjs');
    // Then
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, message);
  });
}

for (const [name, before, after, message] of [
  ['shell 선언 없음', 'const appShell = [', 'const removedShell = [', /appShell array not found/],
  ['navigation fallback 없음', 'event.request.mode === "navigate"', 'false', /must handle navigation fallback/],
]) {
  test(`T04-F02: ${name}은 SW 정적 계약 실패다`, t => {
    // Given
    const f = pwa(t);
    f.write('public/sw.js', f.read('public/sw.js').replace(before, after));
    // When
    const result = f.run('check-pwa.mjs');
    // Then
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, message);
  });
}

test('T04-F03: 손상된 manifest JSON은 nonzero이며 PASS를 출력하지 않는다', t => {
  // Given
  const f = pwa(t);
  f.write('public/manifest.webmanifest', '{');
  // When
  const result = f.run('check-pwa.mjs');
  // Then
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /SyntaxError/);
  assert.doesNotMatch(result.output, /PWA check passed/);
});
