import assert from 'node:assert/strict';
import { test, expect } from '../support/client-fixture.mjs';

const children = [
  { id: 'child-1', name: '민준', level: '2', goal: '매일 읽기' },
  { id: 'child-2', name: '서준', level: '1', goal: '다른 기록' },
];
const books = [
  { id: 'book-focus', series: 'Oxford', title: '집중 책' },
  { id: 'book-word', content_type: 'wordReading', series: 'Words', title: '단어 자료' },
  { id: 'book-other', series: 'Other', title: '서준의 집중 책' },
  { id: 'book-inactive', active: false, series: 'Old', title: '비활성 이력 책' },
];
const assignments = [
  { id: 'focus', child_id: 'child-1', date: '2026-10-18', book_id: 'book-focus', activity_category: 'focusListen', tasks: ['listen'], task_counts: { listen: 1 }, quiz_enabled: true, quiz_score: 'PASS' },
  { id: 'word', child_id: 'child-1', date: '2026-10-18', book_id: 'book-word', activity_category: 'extraStudy', tasks: ['wordRead'], task_counts: { wordRead: 1 } },
  { id: 'old', child_id: 'child-1', date: '2026-10-18', book_id: 'book-inactive', activity_category: 'readAloud', tasks: ['self'], task_counts: { self: 1 }, quiz_enabled: true, quiz_score: 'FAIL' },
  { id: 'other', child_id: 'child-2', date: '2026-10-18', book_id: 'book-other', activity_category: 'focusListen', tasks: ['listen'], task_counts: { listen: 1 } },
];
const completions = [
  { assignment_id: 'focus', task_type: 'listen', completed_at: '2026-10-18T01:00:00.000Z', minutes: 10, audio_opened_at: null, count: 3 },
  { assignment_id: 'word', task_type: 'wordRead', completed_at: '2026-10-18T01:00:00.000Z', minutes: 5, audio_opened_at: null, count: 1 },
  { assignment_id: 'old', task_type: 'self', completed_at: '2026-10-18T01:00:00.000Z', minutes: 5, audio_opened_at: null, count: 1 },
  { assignment_id: 'other', task_type: 'listen', completed_at: '2026-10-18T01:00:00.000Z', minutes: 8, audio_opened_at: null, count: 1 },
];

async function openParent(page) {
  await page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();
  await page.locator('#parentTitle').waitFor();
}
function seedReport(f, extra = {}) { f.seed({ children, books, assignments, completions, ...extra }); }
function manualWrites(f) { return f.writes('manual_logs'); }

test('U08-N01 정상: 주간 기본 보고서는 활동 구분·시간·횟수·퀴즈와 비활성 책 이력을 연결한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);

  // When
  const report = f.page.locator('.print-report');

  // Then
  await expect(f.page.getByText('2026. 10/18(일) - 2026. 10/24(토)', { exact: true })).toBeVisible();
  await expect(report).toContainText('Oxford');
  await expect(report).toContainText('집중 책');
  await expect(report).toContainText('읽기 3회');
  await expect(report).toContainText('퀴즈 (PASS)');
  await expect(report).toContainText('단어 자료');
  await expect(report).toContainText('비활성 이력 책');
  await expect(report).toContainText('퀴즈 (FAIL)');
  await expect(f.page.locator('.stats-grid')).toContainText('기간 활동');
  await expect(f.page.locator('.stats-grid')).toContainText('20분');
  await expect(f.page.locator('.stats-grid')).toContainText('2권');
});

test('U08-E01 경계: 월 전환과 이전·다음은 연말 경계를 가진 정확한 parent range query를 보낸다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);
  await f.page.getByRole('button', { name: '월', exact: true }).click();
  await f.page.getByLabel('활동 기록 기준 날짜 선택').fill('2026-12-15');

  // When
  await f.page.getByRole('button', { name: '다음 기간' }).click();

  // Then
  await expect(f.page.getByText('2027. 1', { exact: true })).toBeVisible();
  await expect.poll(() => f.requests.some((request) => request.path === '/rest/v1/assignments'
    && request.method === 'GET'
    && new URLSearchParams(request.query).getAll('date').join(',') === 'gte.2027-01-01,lte.2027-01-31')).toBe(true);
  const requests = f.requests.filter(request => request.path === '/rest/v1/assignments' && request.method === 'GET');
  const last = new URLSearchParams(requests.at(-1).query);
  assert.deepEqual(last.getAll('date'), ['gte.2027-01-01', 'lte.2027-01-31']);
  await f.page.getByRole('button', { name: '이전 기간' }).click();
  await expect(f.page.getByText('2026. 12', { exact: true })).toBeVisible();
});

test('U08-E02 경계: 빈 기간은 다른 기간 자료를 합치지 않고 빈 상태를 표시한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);

  // When
  await f.page.getByLabel('활동 기록 기준 날짜 선택').fill('2026-11-01');

  // Then
  await expect(f.page.locator('.stats-grid')).toContainText('0건');
  await expect(f.page.locator('.stats-grid')).toContainText('0분');
  await expect(f.page.locator('.print-report')).not.toContainText('집중 책');
  await expect(f.page.locator('.activity-table tbody tr')).toHaveCount(7);
});

test('U08-N02 정상: 아동 프로필을 바꿔 부모 보고서를 다시 열면 해당 아동 기록만 보인다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);

  // When
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click();
  await f.page.locator('.profile-grid').getByRole('button', { name: /서준/ }).click();
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click();
  await f.page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();

  // Then
  await expect(f.page.locator('.stats-grid')).toContainText('서준');
  await expect(f.page.locator('.print-report')).toContainText('서준의 집중 책');
  await expect(f.page.locator('.stats-grid')).toContainText('8분');
  await expect(f.page.locator('.print-report')).not.toContainText('읽기 3회');
  await expect(f.page.locator('.print-report')).not.toContainText('퀴즈 (PASS)');
  await expect(f.page.locator('.print-report')).not.toContainText('비활성 이력 책');
});

test('U08-N03 정상: 날짜별 활동 칸은 필사와 퀴즈만 기록을 해당 분류에 배치한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f, {
    books: [
      ...books,
      { id: 'book-copy', series: 'Write', title: '필사 자료' },
      { id: 'book-quiz', series: 'Quiz', title: '퀴즈만 책' },
    ],
    assignments: [
      ...assignments,
      { id: 'copy', child_id: 'child-1', date: '2026-10-19', book_id: 'book-copy', activity_category: 'extraStudy', tasks: ['copywork'], task_counts: { copywork: 1 } },
      { id: 'quiz', child_id: 'child-1', date: '2026-10-19', book_id: 'book-quiz', activity_category: 'focusListen', tasks: [], task_counts: {}, quiz_enabled: true, quiz_score: 'PASS' },
    ],
    completions: [
      ...completions,
      { assignment_id: 'copy', task_type: 'copywork', completed_at: '2026-10-19T01:00:00.000Z', minutes: 15, audio_opened_at: null, count: 1 },
    ],
  });
  await openParent(f.page);
  const row = f.page.locator('.activity-table tbody tr').filter({ hasText: '10/19(월)' });

  // When
  await row.waitFor();

  // Then
  await expect(row.locator('td').nth(3)).toContainText('퀴즈만 책');
  await expect(row.locator('td').nth(7)).toContainText('필사 자료');
  await expect(row.locator('td').nth(3)).toContainText('퀴즈 (PASS)');
  await expect(row.locator('td').nth(7)).toContainText('필사');
});

test('U09-N01 정상: 부모 수기 입력은 owner/child payload와 화면을 연결한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);
  await f.page.getByRole('button', { name: '수기 입력', exact: true }).click();
  const form = f.page.locator('.parent-section').filter({ has: f.page.locator('#manualLogTitle') }).locator('form');
  await form.locator('input[name="manualTitle"]').fill('Arthur DVD');
  await form.locator('input[name="manualMinutes"]').fill('25');

  // When
  await form.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  await expect.poll(() => manualWrites(f).length).toBe(1);
  assert.deepEqual(manualWrites(f)[0].body, { owner_user_id: 'owner-1', child_id: 'child-1', date: '2026-10-18', type: 'dvd', title: 'Arthur DVD', minutes: 25, note: '' });
  await f.page.getByRole('button', { name: '활동 기록', exact: true }).click();
  await expect(f.page.locator('.print-report')).toContainText('Arthur DVD');
});

test('U09-N02 정상: 부모 수기 삭제는 matching owner/id request 뒤 화면에서만 기록을 제거한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f, { manual_logs: [{ id: 'manual-existing', child_id: 'child-1', date: '2026-10-18', type: 'dvd', title: '삭제할 기록', minutes: 20, note: '' }] });
  await openParent(f.page);

  // When
  await f.page.getByRole('button', { name: '삭제', exact: true }).click();

  // Then
  await expect(f.page.getByText('수기 기록을 삭제했습니다.')).toBeVisible();
  await expect.poll(() => manualWrites(f).length).toBe(1);
  const deletion = manualWrites(f).at(-1);
  assert.equal(deletion.method, 'DELETE');
  assert.equal(new URLSearchParams(deletion.query).get('owner_user_id'), 'eq.owner-1');
  assert.equal(new URLSearchParams(deletion.query).get('id'), 'eq.manual-existing');
  await expect(f.page.locator('.print-report')).not.toContainText('삭제할 기록');
});

test('U09-N03 정상: 아동 빠른 기록은 오늘/선택 아동 payload와 부모 보고서를 연결한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await f.page.reload();
  await f.page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await f.page.getByRole('button', { name: '읽은 책 기록', exact: true }).click();
  const dialog = f.page.getByRole('dialog');
  await dialog.locator('input[name="childManualTitle"]').fill('한글 동화');

  // When
  await dialog.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  await expect.poll(() => manualWrites(f).length).toBe(1);
  assert.deepEqual(manualWrites(f)[0].body, { owner_user_id: 'owner-1', child_id: 'child-1', date: '2026-10-18', type: 'korean', title: '한글 동화', minutes: 10, note: '' });
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click();
  await openParent(f.page);
  await expect(f.page.locator('.print-report')).toContainText('한글 동화');
});

test('U09-F01 잘못된 입력: 빈 부모 수기 제목은 저장 요청을 만들지 않는다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);
  await f.page.getByRole('button', { name: '수기 입력', exact: true }).click();
  const form = f.page.locator('.parent-section').filter({ has: f.page.locator('#manualLogTitle') }).locator('form');

  // When
  await form.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  assert.equal(manualWrites(f).length, 0);
});

test('U09-F02 실패: 부모 수기 저장 실패는 성공 UI나 local mutation을 만들지 않는다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);
  await f.page.getByRole('button', { name: '수기 입력', exact: true }).click();
  const form = f.page.locator('.parent-section').filter({ has: f.page.locator('#manualLogTitle') }).locator('form');
  f.fail('manual_logs:POST');
  await form.locator('input[name="manualTitle"]').fill('실패 기록');

  // When
  await form.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  await expect(f.page.getByText('manual_logs 테스트 실패')).toBeVisible();
  await expect.poll(() => manualWrites(f).length).toBe(1);
  assert.equal(manualWrites(f).length, 1);
  await expect(f.page.getByRole('button', { name: '활동 기록', exact: true })).toBeVisible();
  await f.page.getByRole('button', { name: '활동 기록', exact: true }).click();
  await expect(f.page.locator('.print-report')).not.toContainText('실패 기록');
});

test('U09-F05 잘못된 입력: 아동 빈 제목은 저장 요청을 만들지 않는다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await f.page.reload();
  await f.page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await f.page.getByRole('button', { name: '읽은 책 기록', exact: true }).click();

  // When
  await f.page.getByRole('dialog').getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  assert.equal(manualWrites(f).length, 0);
});

test('U09-F06 실패: 아동 수기 저장 실패는 닫힘이나 성공 기록을 만들지 않는다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await f.page.reload();
  await f.page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await f.page.getByRole('button', { name: '읽은 책 기록', exact: true }).click();
  const dialog = f.page.getByRole('dialog');
  await dialog.locator('input[name="childManualTitle"]').fill('저장 실패 동화');
  f.fail('manual_logs:POST');

  // When
  await dialog.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  await expect.poll(() => manualWrites(f).length).toBe(1);
  assert.equal(manualWrites(f).length, 1);
  await expect(f.page.getByText('manual_logs 테스트 실패')).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="childManualTitle"]')).toHaveValue('저장 실패 동화');
});

test('U09-F03 실패: 부모 수기 삭제 실패는 기존 기록을 화면에 유지한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f, { manual_logs: [{ id: 'manual-existing', child_id: 'child-1', date: '2026-10-18', type: 'dvd', title: '기존 기록', minutes: 20, note: '' }] });
  await openParent(f.page);
  f.fail('manual_logs:DELETE');

  // When
  await f.page.getByRole('button', { name: '삭제', exact: true }).click();

  // Then
  await expect(f.page.getByText('manual_logs 테스트 실패')).toBeVisible();
  await expect.poll(() => manualWrites(f).length).toBe(1);
  assert.equal(manualWrites(f).length, 1);
  await expect(f.page.locator('.print-report')).toContainText('기존 기록');
});

test('U09-N04 경계: 주간 print는 준비된 week DOM만 호출하고 print media 뒤 screen UI를 복원한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f, { manual_logs: [{ id: 'month-only', child_id: 'child-1', date: '2026-10-15', type: 'dvd', title: '월간 전용 기록', minutes: 10, note: '' }] });
  await openParent(f.page);
  await f.page.getByRole('button', { name: '월', exact: true }).click();
  await expect(f.page.locator('.print-report')).toContainText('월간 전용 기록');
  await expect(f.page.locator('.stats-grid')).toContainText('30분');
  await f.page.emulateMedia({ media: 'print' });
  await expect(f.page.locator('.print-report')).toBeVisible();
  await expect(f.page.locator('.activity-control-panel')).toBeHidden();
  await f.page.emulateMedia({ media: 'screen' });
  await expect(f.page.locator('.activity-control-panel')).toBeVisible();

  // When
  await f.page.getByRole('button', { name: '주간 PDF 출력', exact: true }).click();
  await expect(f.page.getByText('2026. 10/18(일) - 2026. 10/24(토)', { exact: true })).toBeVisible();
  await expect(f.page.locator('.print-report')).not.toContainText('월간 전용 기록');
  await expect(f.page.locator('.print-report')).toContainText('집중 책');
  await expect(f.page.locator('.stats-grid')).toContainText('5건');
  await expect(f.page.locator('.stats-grid')).toContainText('20분');
  await f.page.clock.fastForward(119);

  // Then
  assert.equal(await f.printCalls(), 0);
  await f.page.clock.fastForward(1);
  assert.equal(await f.printCalls(), 1);
  const [printed] = await f.printSnapshots();
  assert.match(printed.subtitle, /^민준 · 2026\. 10\/18\(일\) - 2026\. 10\/24\(토\)/);
  assert.deepEqual(printed.stats, ['민준', '5건', '20분', '2권']);
  assert.deepEqual(printed.dates, ['10/18(일)', '10/19(월)', '10/20(화)', '10/21(수)', '10/22(목)', '10/23(금)', '10/24(토)']);
  assert.ok(printed.cells.some((cell) => cell.includes('집중 책') && cell.includes('읽기 3회')));
});

test('U09-F04 실패: 주간 print 준비 조회가 실패하면 print 호출을 만들지 않는다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);
  await f.page.getByRole('button', { name: '월', exact: true }).click();
  f.fail('assignments:GET');

  // When
  await f.page.getByRole('button', { name: '주간 PDF 출력', exact: true }).click();
  await expect(f.page.getByText('assignments 테스트 실패')).toBeVisible();
  await f.page.clock.fastForward(200);

  // Then
  assert.equal(await f.printCalls(), 0);
});

test('U09-F07 expected-fail: 출력 대기 중 아동 프로필로 전환하면 print timer를 취소한다', async ({ parentReport: f }) => {
  // Given
  seedReport(f);
  await openParent(f.page);

  // When
  await f.page.getByRole('button', { name: '주간 PDF 출력', exact: true }).click();
  await expect(f.page.getByText('2026. 10/18(일) - 2026. 10/24(토)', { exact: true })).toBeVisible();
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click();
  await f.page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await f.page.locator('#childTitle').waitFor();
  await f.page.clock.fastForward(120);
  const printCalls = await f.printCalls();
  if (printCalls === 1) {
    const [printed] = await f.printSnapshots();
    assert.deepEqual(printed.stats, []);
  }

  // Then
  try {
    assert.equal(printCalls, 0);
  } catch (error) {
    if (error?.code === 'ERR_ASSERTION' && error.actual === 1 && error.expected === 0) {
      test.fail(true, '현재 print effect는 active profile 변경을 관찰하지 않아 아동 화면 전환 뒤에도 window.print를 호출한다.');
    }
    throw error;
  }
});
