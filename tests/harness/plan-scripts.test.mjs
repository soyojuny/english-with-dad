import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeGit, fixture } from './helpers/script-fixture.mjs';

const diff = ['diff', '--name-only', '--diff-filter=ACDMRTUXB', 'HEAD'];
const untracked = ['ls-files', '--others', '--exclude-standard'];
function section(output, heading, next) {
  return output.split(`${heading}:\n`)[1].split(next ? `\n\n${next}:` : '\n\n')[0].trim();
}

for (const [request, category, skill] of [
  ['일반 기능 수정', 'feature', 'ewd-feature-change'],
  ['Supabase 인증', 'supabase', 'ewd-supabase-change'],
  ['모바일 카메라', 'ui-pwa', 'ewd-ui-regression'],
  ['문서 정리', 'docs', null],
  ['하네스 검증', 'harness', null],
]) {
  test(`T05-N01: 요청 ${category} 분류는 해당 skill과 기본 정적 검사를 안내한다`, t => {
    // Given
    const f = fixture(t);
    const git = fakeGit(f, [{ args: diff }, { args: untracked }]);
    // When
    const result = git.run('plan-workflow.mjs', [request]);
    // Then
    assert.equal(result.status, 0, result.output);
    assert.equal(section(result.output, 'Request categories', 'Changed file categories'), `- ${category}`);
    assert.match(result.output, /npm run check:contracts/);
    if (skill) assert.ok(result.output.includes(`.agents/skills/${skill}`), result.output);
    assert.equal(f.has('plans'), false, 'workflow reports a plan; it does not create plan files');
  });
}

test('T05-E01: 빈 요청과 clean 파일 목록은 경고와 기본 feature 분류를 제공한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [{ args: diff }, { args: untracked }]);
  // When
  const result = git.run('plan-workflow.mjs');
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /No request text was provided/);
  assert.equal(section(result.output, 'Changed files', 'Recommended skills'), '- none');
  assert.equal(section(result.output, 'Request categories', 'Changed file categories'), '- feature');
});

test('T05-E02: tracked/untracked 중복 제거와 코드·DB·UI 범위 경고를 함께 안내한다', t => {
  // Given
  const f = fixture(t);
  const git = fakeGit(f, [
    { args: diff, stdout: 'docs/note.md\nlib/change.ts\nsupabase/change.sql\nstyles.css\nscripts/tool.mjs\nother.txt\n' },
    { args: untracked, stdout: 'docs/note.md\nplans/active/demo/plan.md\napp/new.tsx\n' },
  ]);
  // When
  const result = git.run('plan-workflow.mjs', ['문서 계획']);
  // Then
  assert.equal(result.status, 0, result.output);
  const files = section(result.output, 'Changed files', 'Recommended skills').split('\n');
  assert.equal(files.filter(file => file === '- docs/note.md').length, 1);
  for (const category of ['docs', 'feature', 'supabase', 'ui-pwa', 'harness', 'other']) {
    assert.ok(section(result.output, 'Changed file categories', 'Changed files').includes(`- ${category}`));
  }
  for (const check of ['check:contracts', 'test:unit', 'typecheck', 'build', 'check:pwa']) {
    assert.ok(section(result.output, 'Recommended checks', 'Scope warnings').includes(`npm run ${check}`));
  }
  assert.match(result.output, /Docs\/harness request with code or data changes/);
  assert.match(result.output, /Supabase files changed but the request/);
  assert.match(result.output, /UI\/PWA files changed but the request/);
});

test('T05-F01: git 조회 실패는 파일 없음으로 처리하고 요청 기반 안내를 유지한다', t => {
  // Given: workflow intentionally tolerates missing/unavailable git metadata.
  const f = fixture(t);
  const git = fakeGit(f, [{ args: diff, status: 128 }, { args: untracked, status: 128 }]);
  // When
  const result = git.run('plan-workflow.mjs', ['Supabase 모바일 기능']);
  // Then
  assert.equal(result.status, 0, result.output);
  assert.equal(section(result.output, 'Changed files', 'Recommended skills'), '- none');
  for (const skill of ['ewd-feature-change', 'ewd-supabase-change', 'ewd-ui-regression']) assert.ok(result.output.includes(skill));
});

function plan(t, status = 'Complete') {
  const f = fixture(t);
  f.write('plans/active/demo/plan.md', '# Preserve this plan\n');
  f.write('plans/active/demo/review.md', `# Review\r\n\r\n## Status\r\n\r\n ${status} \r\n`);
  f.write('plans/active/demo/tasks/one.md', 'task evidence\n');
  return f;
}

for (const [status, argument] of [['pass', 'demo'], ['PASSED', 'plans/active/demo/'], ['Complete', 'plans\\active\\demo\\']]) {
  test(`T06-N01: review ${status}는 ${argument}의 temp plan 전체를 이동한다`, t => {
    // Given
    const f = plan(t, status);
    const review = f.read('plans/active/demo/review.md');
    // When
    const result = f.run('plan-archive.mjs', [argument]);
    // Then
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Archived plan: plans\/active\/demo -> plans\/archive\/demo/);
    assert.equal(f.has('plans/active/demo'), false);
    assert.equal(f.read('plans/archive/demo/plan.md'), '# Preserve this plan\n');
    assert.equal(f.read('plans/archive/demo/review.md'), review);
    assert.equal(f.read('plans/archive/demo/tasks/one.md'), 'task evidence\n');
  });
}

test('T06-E01: 이미 archive된 plan 재실행은 동일 내용을 유지하는 성공이다', t => {
  // Given
  const f = fixture(t);
  f.write('plans/archive/demo/plan.md', 'already archived\n');
  // When
  const result = f.run('plan-archive.mjs', ['plans/archive/demo']);
  // Then
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Plan already archived/);
  assert.equal(f.read('plans/archive/demo/plan.md'), 'already archived\n');
  assert.equal(f.has('plans/active/demo'), false);
});

test('T06-E02: active/archive 동시 존재는 덮어쓰지 않고 거부한다', t => {
  // Given
  const f = plan(t);
  f.write('plans/archive/demo/plan.md', 'keep destination\n');
  // When
  const result = f.run('plan-archive.mjs', ['demo']);
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Archive target already exists/);
  assert.equal(f.read('plans/active/demo/plan.md'), '# Preserve this plan\n');
  assert.equal(f.read('plans/archive/demo/plan.md'), 'keep destination\n');
});

for (const status of ['Pending', 'Failed', 'Complete with findings']) {
  test(`T06-F01: review ${status}는 active 내용을 보존하고 거부한다`, t => {
    // Given
    const f = plan(t, status);
    // When
    const result = f.run('plan-archive.mjs', ['demo']);
    // Then
    assert.equal(result.status, 1, result.output);
    assert.ok(result.output.includes(`review status is "${status}"`));
    assert.equal(f.has('plans/active/demo/tasks/one.md'), true);
    assert.equal(f.has('plans/archive/demo'), false);
  });
}

for (const path of ['plan.md', 'review.md', 'tasks']) {
  test(`T06-E03: required ${path} 누락은 archive 전에 거부한다`, t => {
    // Given
    const f = plan(t);
    f.remove(`plans/active/demo/${path}`);
    // When
    const result = f.run('plan-archive.mjs', ['demo']);
    // Then
    assert.equal(result.status, 1, result.output);
    assert.ok(result.output.includes(`Active plan is missing required path: plans/active/demo/${path}`));
    assert.equal(f.has('plans/archive/demo'), false);
  });
}

for (const review of ['# No status\n', '## Status\n\n']) {
  test(`T06-F02: review ${JSON.stringify(review)}는 status 누락으로 거부한다`, t => {
    // Given
    const f = plan(t);
    f.write('plans/active/demo/review.md', review);
    // When
    const result = f.run('plan-archive.mjs', ['demo']);
    // Then
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Review file is missing/);
    assert.equal(f.has('plans/active/demo'), true);
    assert.equal(f.has('plans/archive/demo'), false);
  });
}

for (const argument of [undefined, '../escape', 'demo/nested']) {
  test(`T06-F03: slug ${String(argument)}는 단일 slug 입력 경계에서 거부한다`, t => {
    // Given
    const f = plan(t);
    // When
    const result = f.run('plan-archive.mjs', argument === undefined ? [] : [argument]);
    // Then
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, argument === undefined ? /Plan slug is required/ : /Expected a single plan slug/);
    assert.equal(f.has('plans/active/demo'), true);
    assert.equal(f.has('plans/archive/demo'), false);
  });
}

test('T06-E04: 없는 active plan은 새 archive를 만들지 않는다', t => {
  // Given
  const f = fixture(t);
  // When
  const result = f.run('plan-archive.mjs', ['absent']);
  // Then
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Active plan not found/);
  assert.equal(f.has('plans/archive/absent'), false);
});
