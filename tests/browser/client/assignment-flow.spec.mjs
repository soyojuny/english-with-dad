import assert from 'node:assert/strict';
import { test, expect } from '../support/client-fixture.mjs';

const today = '2026-10-18';
const regularBook = { id: 'book-regular', series: 'Oxford', title: '일반 책', cover: 'data:image/jpeg;base64,AA==', audio_listen: 'https://example.com/read', audio_shadow: 'https://example.com/shadow' };
const wordBook = { id: 'book-word', content_type: 'wordReading', series: 'Words', title: '단어 자료', cover: '', audio_listen: 'https://example.com/words', audio_shadow: '' };
const child = { id: 'child-1', name: '민준', level: '2', goal: '' };

async function openAssignment(page) {
  await page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();
  await page.getByRole('button', { name: '할 일 배정', exact: true }).click();
  await page.getByRole('heading', { name: '날짜별 읽기 목록 만들기' }).waitFor();
}
async function selectProfile(page, name) {
  await page.getByRole('button', { name: '프로필 관리', exact: true }).click();
  await page.locator('.profile-grid').getByRole('button', { name: new RegExp(name) }).click();
}
async function addBook(page, title) {
  const candidate = page.locator('.assignment-candidate').filter({ hasText: title });
  await candidate.getByRole('button', { name: '추가', exact: true }).click();
  return page.locator('.assignment-book-config').filter({ hasText: title });
}
async function create(page) { await page.getByRole('button', { name: '날짜별 할 일 생성', exact: true }).click(); }
function writes(f, method = 'POST') { return f.requests.filter((request) => request.path === '/rest/v1/assignments' && request.method === method); }
function assignment(id = 'assignment-1', overrides = {}) {
  return { id, child_id: 'child-1', date: today, book_id: 'book-regular', activity_category: 'focusListen', tasks: ['listen'], task_counts: { listen: 1 }, quiz_enabled: false, quiz_score: null, ...overrides };
}
test('U02-N01 정상: 여러 날짜와 여러 자료 배정은 날짜별 task/count payload와 오늘 아동 화면을 만든다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook, wordBook] });
  await openAssignment(f.page);
  const start = await f.page.locator('input[name="assignStart"]').inputValue();
  const end = '2026-10-19';
  await f.page.locator('input[name="assignEnd"]').fill(end);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('focusListen');
  await regular.getByRole('combobox', { name: '읽기', exact: true }).selectOption('2');
  await addBook(f.page, '단어 자료');

  // When
  await create(f.page);

  // Then
  assert.equal(start, today);
  assert.deepEqual(writes(f)[0].body, [
    { owner_user_id: 'owner-1', child_id: 'child-1', date: today, book_id: 'book-regular', activity_category: 'focusListen', tasks: ['listen'], task_counts: { listen: 2 }, quiz_enabled: false, quiz_score: null },
    { owner_user_id: 'owner-1', child_id: 'child-1', date: today, book_id: 'book-word', activity_category: 'extraStudy', tasks: ['wordRead'], task_counts: { wordRead: 1 }, quiz_enabled: false, quiz_score: null },
    { owner_user_id: 'owner-1', child_id: 'child-1', date: end, book_id: 'book-regular', activity_category: 'focusListen', tasks: ['listen'], task_counts: { listen: 2 }, quiz_enabled: false, quiz_score: null },
    { owner_user_id: 'owner-1', child_id: 'child-1', date: end, book_id: 'book-word', activity_category: 'extraStudy', tasks: ['wordRead'], task_counts: { wordRead: 1 }, quiz_enabled: false, quiz_score: null },
  ]);
  const scheduled = f.page.locator('.assignment-manage-item');
  await expect(scheduled).toHaveCount(4);
  for (const [date, title, task] of [
    [today, '일반 책', '읽기 2회'],
    [today, '단어 자료', '단어 읽기 1회'],
    [end, '일반 책', '읽기 2회'],
    [end, '단어 자료', '단어 읽기 1회'],
  ]) {
    const row = scheduled.filter({ hasText: `${Number(date.slice(5, 7))}/${Number(date.slice(8))} · ${title}` });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(task);
  }
  await expect(f.page.getByText('4개의 할 일을 생성했습니다. 기존 같은 날짜와 자료는 최신 설정으로 갱신했습니다.')).toBeVisible();
  await selectProfile(f.page, '민준');
  await expect(f.page.locator('.assignment-card')).toHaveCount(2);
  await f.page.locator('.assignment-card').filter({ hasText: '일반 책' }).click();
  await expect(f.page.locator('.status-row')).toContainText('읽기 0/2회');
  await f.page.locator('.assignment-card').filter({ hasText: '단어 자료' }).click();
  await expect(f.page.locator('.status-row')).toContainText('단어 읽기 0/1회');
});

test('U02-E01 경계: 같은 key 재배정은 정확한 upsert 계약으로 최신 값 하나만 병합한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook], assignments: [assignment('old-assignment', { task_counts: { listen: 1 } })] });
  await openAssignment(f.page);
  await f.page.getByRole('searchbox', { name: '책/자료 제목, 시리즈, 권수, 레벨 검색' }).fill('일반 책');
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('focusListen');
  await regular.getByRole('combobox', { name: '읽기', exact: true }).selectOption('3');

  // When
  await create(f.page);

  // Then
  assert.equal(writes(f).length, 1);
  const query = new URLSearchParams(writes(f)[0].query);
  assert.equal(query.get('on_conflict'), 'owner_user_id,child_id,date,book_id,activity_category');
  assert.equal(query.get('columns'), '"owner_user_id","child_id","date","book_id","activity_category","tasks","task_counts","quiz_enabled","quiz_score"');
  assert.equal(query.get('select'), 'id,owner_user_id,child_id,date,book_id,activity_category,tasks,task_counts,quiz_enabled,quiz_score');
  assert.deepEqual(writes(f)[0].body[0].task_counts, { listen: 3 });
  await expect(f.page.locator('.assignment-manage-item')).toHaveCount(1);
  await expect(f.page.locator('.assignment-manage-item')).toContainText('읽기 3회');
  await expect(f.page.getByText('0개의 할 일을 생성했습니다. 기존 같은 날짜와 자료는 최신 설정으로 갱신했습니다.')).toBeVisible();
});

test('U02-E02 경계: 퀴즈 기본값 N은 생성 payload에 false와 null score를 보낸다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('englishPicture');

  // When
  await create(f.page);

  // Then
  assert.equal(writes(f)[0].body[0].quiz_enabled, false);
  assert.equal(writes(f)[0].body[0].quiz_score, null);
});

test('U02-E03 경계: 퀴즈 전용 배정은 task 없이 Y payload로 저장한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('focusListen');
  for (const name of ['읽기', '정따', '스스로 읽기']) await regular.getByRole('combobox', { name, exact: true }).selectOption('0');
  await regular.getByRole('combobox', { name: '퀴즈', exact: true }).selectOption('Y');

  // When
  await create(f.page);

  // Then
  assert.deepEqual(writes(f)[0].body[0], { owner_user_id: 'owner-1', child_id: 'child-1', date: today, book_id: 'book-regular', activity_category: 'focusListen', tasks: [], task_counts: {}, quiz_enabled: true });
});

test('U03-F01 잘못된 입력: 종료일 역전은 write 없이 정확한 안내를 표시한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('englishPicture');
  await f.page.locator('input[name="assignStart"]').fill('2026-10-20');
  await f.page.locator('input[name="assignEnd"]').fill('2026-10-19');

  // When
  await create(f.page);

  // Then
  assert.equal(writes(f).length, 0);
  await expect(f.page.getByText('종료일은 시작일보다 빠를 수 없습니다.')).toBeVisible();
});

test('U03-F02 계약-level N/A: 아동 없음으로 submit은 disabled라 실제 click 불가, form submit guard가 안내한다', async ({ assignment: f }) => {
  // Given: no child also means no selectable material and the submit button is disabled, so a real user click cannot reach this guard.
  f.seed({ books: [regularBook] });
  await openAssignment(f.page);
  const form = f.page.locator('form.book-form');
  await expect(form.getByRole('button', { name: '날짜별 할 일 생성', exact: true })).toBeDisabled();

  // When: contract-level submission reaches the otherwise unreachable guard.
  await form.evaluate((element) => element.requestSubmit());

  // Then
  assert.equal(writes(f).length, 0);
  await expect(f.page.getByText('먼저 아동을 추가하세요.')).toBeVisible();
});

test('U03-F03 잘못된 입력: 활동을 선택하지 않으면 write 없이 활동 안내를 표시한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  await addBook(f.page, '일반 책');

  // When
  await create(f.page);

  // Then
  assert.equal(writes(f).length, 0);
  await expect(f.page.getByText('책/자료별 활동 구분을 선택하세요.')).toBeVisible();
});

test('U03-F04 잘못된 입력: 횟수 0과 퀴즈 N은 write 없이 상세 활동 안내를 표시한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('focusListen');
  for (const name of ['읽기', '정따', '스스로 읽기']) await regular.getByRole('combobox', { name, exact: true }).selectOption('0');

  // When
  await create(f.page);

  // Then
  assert.equal(writes(f).length, 0);
  await expect(f.page.getByText('일반 책의 상세 활동 횟수 또는 퀴즈 Y를 설정하세요.')).toBeVisible();
});

test('U04-N01 정상: 일반 책 기타학습은 필사 1회 규칙으로 저장한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('extraStudy');

  // When
  await create(f.page);

  // Then
  assert.deepEqual(writes(f)[0].body[0].task_counts, { copywork: 1 });
  assert.deepEqual(writes(f)[0].body[0].tasks, ['copywork']);
  assert.equal(writes(f)[0].body[0].quiz_enabled, false);
});

test('U04-N02 정상: 영어 그림책은 선택한 횟수와 관계없이 읽기 1회로 저장한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('englishPicture');

  // When
  await create(f.page);

  // Then
  assert.deepEqual(writes(f)[0].body[0].task_counts, { listen: 1 });
  assert.deepEqual(writes(f)[0].body[0].tasks, ['listen']);
});

test('U04-N03 정상: 예정 배정 편집에서 퀴즈를 N으로 바꾸면 score를 초기화하고 목록을 갱신한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook], assignments: [assignment('assignment-1', { date: '2026-10-20', task_counts: { listen: 2 }, quiz_enabled: true, quiz_score: 'PASS' })] });
  await openAssignment(f.page);
  await f.page.getByRole('button', { name: '수정', exact: true }).click();
  const edit = f.page.locator('.assignment-edit-form');
  await edit.getByRole('combobox', { name: '읽기', exact: true }).selectOption('1');
  await edit.getByRole('combobox', { name: '퀴즈', exact: true }).selectOption('N');

  // When
  await edit.getByRole('button', { name: '횟수 저장', exact: true }).click();

  // Then
  assert.deepEqual(writes(f, 'PATCH')[0].body, { tasks: ['listen'], task_counts: { listen: 1 }, quiz_enabled: false, quiz_score: null });
  await expect(f.page.locator('.assignment-manage-item')).toContainText('읽기 1회');
  await expect(f.page.getByText('할 일을 수정했습니다.')).toBeVisible();
});

test('U04-N04 정상: 퀴즈 전용 편집은 빈 task/count PATCH와 병합된 예정표를 만든다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook], assignments: [assignment()] });
  await openAssignment(f.page);
  await f.page.getByRole('button', { name: '수정', exact: true }).click();
  const edit = f.page.locator('.assignment-edit-form');
  await edit.getByRole('combobox', { name: '읽기', exact: true }).selectOption('0');
  await edit.getByRole('combobox', { name: '퀴즈', exact: true }).selectOption('Y');

  // When
  await edit.getByRole('button', { name: '횟수 저장', exact: true }).click();

  // Then
  assert.deepEqual(writes(f, 'PATCH')[0].body, { tasks: [], task_counts: {}, quiz_enabled: true });
  await expect(f.page.locator('.assignment-manage-item')).toContainText('퀴즈 Y');
  await expect(f.page.getByText('할 일을 수정했습니다.')).toBeVisible();
});

test('U04-E01 경계: 삭제 성공 뒤 같은 날짜와 자료를 다시 배정하면 예정 목록에 하나만 표시한다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook], assignments: [assignment()] });
  await openAssignment(f.page);

  // When
  await f.page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(f.page.locator('.assignment-manage-item')).toHaveCount(0);
  await expect(f.page.getByText('할 일을 삭제했습니다.')).toBeVisible();
  await f.page.getByRole('searchbox', { name: '책/자료 제목, 시리즈, 권수, 레벨 검색' }).fill('일반 책');
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('focusListen');
  await create(f.page);

  // Then
  assert.equal(writes(f, 'DELETE').length, 1);
  await expect(f.page.locator('.assignment-manage-item')).toHaveCount(1);
  await expect(f.page.locator('.assignment-manage-item')).toContainText('읽기 1회');
});

test('U04-F01 실패: 저장 HTTP 실패는 성공 수나 예정 목록을 만들지 않는다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook] });
  await openAssignment(f.page);
  const regular = await addBook(f.page, '일반 책');
  await regular.getByRole('combobox', { name: '활동 구분' }).selectOption('englishPicture');
  f.fail('assignments');

  // When
  await create(f.page);

  // Then
  assert.equal(writes(f).length, 1);
  await expect(f.page.getByText('assignments 저장 실패')).toBeVisible();
  await expect(f.page.locator('.assignment-manage-item')).toHaveCount(0);
  await expect(f.page.getByText(/개의 할 일을 생성했습니다/)).toHaveCount(0);
});

test('U04-F02 실패: 삭제 HTTP 실패는 예정 목록과 성공 안내를 바꾸지 않는다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook], assignments: [assignment()] });
  await openAssignment(f.page);
  f.fail('assignments');

  // When
  await f.page.getByRole('button', { name: '삭제', exact: true }).click();

  // Then
  assert.equal(writes(f, 'DELETE').length, 1);
  await expect(f.page.locator('.assignment-manage-item')).toHaveCount(1);
  await expect(f.page.locator('.assignment-manage-item')).toContainText('읽기 1회');
  await expect(f.page.getByText('assignments 저장 실패')).toBeVisible();
  await expect(f.page.getByText('할 일을 삭제했습니다.')).toHaveCount(0);
});

test('U04-F03 실패: PATCH 실패는 existing count/quiz/list/edit form을 유지하고 success toast를 표시하지 않는다', async ({ assignment: f }) => {
  // Given
  f.seed({ children: [child], books: [regularBook], assignments: [assignment('assignment-1', { task_counts: { listen: 2 }, quiz_enabled: true })] });
  await openAssignment(f.page);
  await f.page.getByRole('button', { name: '수정', exact: true }).click();
  const edit = f.page.locator('.assignment-edit-form');
  await edit.getByRole('combobox', { name: '읽기', exact: true }).selectOption('1');
  await edit.getByRole('combobox', { name: '퀴즈', exact: true }).selectOption('N');
  f.fail('assignments');

  // When
  await edit.getByRole('button', { name: '횟수 저장', exact: true }).click();

  // Then
  assert.deepEqual(writes(f, 'PATCH')[0].body, { tasks: ['listen'], task_counts: { listen: 1 }, quiz_enabled: false, quiz_score: null });
  await expect(f.page.locator('.assignment-manage-item')).toContainText('읽기 2회 · 퀴즈 Y');
  await expect(edit).toBeVisible();
  await expect(edit.getByRole('combobox', { name: '읽기', exact: true })).toHaveValue('1');
  await expect(edit.getByRole('combobox', { name: '퀴즈', exact: true })).toHaveValue('N');
  await expect(f.page.getByText('assignments 저장 실패')).toBeVisible();
  await expect(f.page.getByText('할 일을 수정했습니다.')).toHaveCount(0);
});
