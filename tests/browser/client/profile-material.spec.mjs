import assert from 'node:assert/strict';
import { test, expect } from '../support/client-fixture.mjs';

async function openParentBooks(page) {
  await page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();
  await page.getByRole('button', { name: '자료 관리', exact: true }).click();
  await page.getByRole('heading', { name: '책과 단어 읽기 자료 입력' }).waitFor();
}

async function createBook(page, values) {
  const form = page.getByRole('region', { name: '자료 입력 양식' });
  await form.getByLabel('시리즈').fill(values.series);
  await form.getByLabel('책 제목').fill(values.title);
  await form.getByLabel('읽기 네이버 링크').fill(values.listen);
  await form.getByLabel('정따 네이버 링크').fill(values.shadow);
  await form.getByRole('button', { name: '책 추가', exact: true }).click();
}

test('U01-N01 정상: 새 아동을 저장하고 편집한 뒤 아동 프로필로 전환하면 정리된 목록 값을 보여 준다', async ({ profileMaterial: f }) => {
  // Given
  const form = f.page.locator('.profile-management-grid form');
  await form.getByLabel('이름').fill('  민준  ');
  await form.getByLabel('레벨').fill('  2  ');
  await form.getByLabel('목표').fill('  오늘 한 권  ');

  // When
  await form.getByRole('button', { name: '아동 추가', exact: true }).click();
  await f.page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await f.page.getByRole('button', { name: '프로필 관리', exact: true }).click();
  await f.page.locator('.child-item').getByRole('button', { name: /민준/ }).click();
  await form.getByLabel('목표').fill('  매일 두 권  ');
  await form.getByRole('button', { name: '아동 저장', exact: true }).click();

  // Then
  assert.deepEqual(f.writes('children').map(request => request.body), [
    { owner_user_id: 'owner-1', name: '민준', level: '2', goal: '오늘 한 권' },
    { name: '민준', level: '2', goal: '매일 두 권' },
  ]);
  await expect(f.page.locator('.child-item')).toContainText('매일 두 권');
  await expect(f.page.locator('.profile-grid').getByRole('button', { name: /민준/ })).toBeVisible();
});

test('U01-N02 정상: 일반 책을 저장하고 편집하면 정리된 값이 요청과 목록에 반영된다', async ({ profileMaterial: f }) => {
  // Given
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();

  // When
  await createBook(f.page, { series: '  Oxford  ', title: '  Frog and Toad  ', listen: 'https://example.com/read', shadow: 'https://example.com/shadow' });
  await f.page.getByLabel('책 제목').fill('  Frog and Toad Together  ');
  await f.page.getByRole('button', { name: '책 저장', exact: true }).click();

  // Then
  assert.equal(f.writes('books').length, 2);
  assert.equal(f.writes('books')[0].body.series, 'Oxford');
  assert.equal(f.writes('books')[1].body.title, 'Frog and Toad Together');
  await expect(f.page.locator('.manage-list')).toContainText('Frog and Toad Together');
});

test('U01-N03 정상: 자료를 검색하면 data URL 표지의 준비 완료 자료만 결과에 표시한다', async ({ profileMaterial: f }) => {
  // Given
  f.seed({ books: [
    { id: 'ready-book', series: 'Ready', title: 'Ready Fox', cover: 'data:image/jpeg;base64,AA==', audio_listen: 'https://example.com/read', audio_shadow: 'https://example.com/shadow' },
    { id: 'other-book', series: 'Other', title: 'Other Fox', cover: 'data:image/jpeg;base64,BB==', audio_listen: 'https://example.com/other-read', audio_shadow: 'https://example.com/other-shadow' },
  ] });
  await openParentBooks(f.page);

  // When
  await f.page.getByPlaceholder('자료 제목 검색').fill('Ready');
  await f.page.getByRole('button', { name: '조회', exact: true }).click();
  await f.page.getByRole('button', { name: /준비 완료/ }).click();

  // Then
  assert.equal(f.writes('books').length, 0);
  assert.ok(f.requests.some(request => request.path === '/rest/v1/books' && request.method === 'GET' && request.query.some(([key, value]) => key === 'title' && value === 'ilike.%Ready%')));
  await expect(f.page.locator('.manage-list')).toContainText('Ready Fox');
  await expect(f.page.locator('.manage-list')).not.toContainText('Other Fox');
  await expect(f.page.locator('img[alt="Ready Fox 표지"]')).toHaveAttribute('src', 'data:image/jpeg;base64,AA==');
});

test('U01-N04 정상: 자료를 비활성화한 뒤 복원하면 상태 요청과 목록 필터가 전환된다', async ({ profileMaterial: f }) => {
  // Given
  f.seed({ books: [{ id: 'active-book', series: 'Oxford', title: 'Restore Me', cover: '', audio_listen: '', audio_shadow: '' }] });
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();
  await f.page.getByRole('button', { name: /Restore Me/ }).click();

  // When
  await f.page.getByRole('button', { name: '책 비활성화', exact: true }).click();

  // Then
  assert.deepEqual(f.writes('books').map(request => request.body), [{ active: false }]);
  await expect(f.page.getByRole('button', { name: /비활성 1/ })).toHaveClass(/is-active/);
  await expect(f.page.locator('.manage-list')).toContainText('Restore Me');
  await expect(f.page.locator('.manage-list')).toContainText('비활성');

  // When
  await f.page.getByRole('button', { name: '다시 활성화', exact: true }).click();

  // Then
  assert.deepEqual(f.writes('books').map(request => request.body), [{ active: false }, { active: true }]);
  await expect(f.page.getByRole('button', { name: /운영 중 1/ })).toHaveClass(/is-active/);
  await expect(f.page.locator('.manage-list')).toContainText('Restore Me');
});

test('U01-N05 정상: 단어 읽기 자료는 읽기 링크만 저장하고 표지와 정따 링크를 비운다', async ({ profileMaterial: f }) => {
  // Given
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();
  await f.page.getByRole('button', { name: '새 단어 읽기', exact: true }).click();
  const form = f.page.getByRole('region', { name: '자료 입력 양식' });
  await form.getByLabel('분류').fill('  Sight words  ');
  await form.getByLabel('단어 읽기 이름').fill('  Set 1  ');
  await form.getByLabel('단어 읽기 QR/URL').fill('https://example.com/words');

  // When
  await form.getByRole('button', { name: '단어 읽기 추가', exact: true }).click();

  // Then
  assert.deepEqual(f.writes('books')[0].body, {
    owner_user_id: 'owner-1', active: true, content_type: 'wordReading', series: 'Sight words', title: 'Set 1', volume: '', level: '', cover: '/assets/app-icon.svg', audio_listen: 'https://example.com/words', audio_shadow: '', note: '',
  });
  await expect(f.page.locator('.manage-list')).toContainText('단어 읽기');
});

test('U01-E01 경계: 저장된 프로필이 없으면 빈 storage와 아동 빈 목록을 유지한다', async ({ profileMaterial: f }) => {
  // Given
  const profile = await f.page.evaluate(() => sessionStorage.getItem('ewd-profile:owner-1'));

  // When
  await f.page.getByRole('heading', { name: '사용할 프로필을 고르세요' }).waitFor();

  // Then
  assert.equal(profile, null);
  assert.equal(f.writes('children').length, 0);
  await expect(f.page.getByRole('heading', { name: '사용할 프로필을 고르세요' })).toBeVisible();
  await expect(f.page.getByText('먼저 아동을 추가하세요. 추가한 즉시 과제와 기록에 연결됩니다.')).toBeVisible();
});

test('U01-E02 경계: 손상된 저장 프로필은 reload 뒤 안전하게 비우고 정리한다', async ({ profileMaterial: f }) => {
  // Given
  await f.page.getByRole('heading', { name: '사용할 프로필을 고르세요' }).waitFor();
  await f.page.evaluate(() => sessionStorage.setItem('ewd-profile:owner-1', '{broken'));
  assert.equal(await f.page.evaluate(() => sessionStorage.getItem('ewd-profile:owner-1')), '{broken');

  // When
  await f.page.reload();

  // Then
  assert.equal(await f.page.evaluate(() => sessionStorage.getItem('ewd-profile:owner-1')), null);
  await expect(f.page.getByRole('heading', { name: '사용할 프로필을 고르세요' })).toBeVisible();
});

test('U01-E03 경계: 표지가 없는 일반 책은 표지 필요 안내를 표시한다', async ({ profileMaterial: f }) => {
  // Given
  f.seed({ books: [{ id: 'no-cover', series: 'Oxford', title: '표지 없음', cover: '', audio_listen: 'https://example.com/read', audio_shadow: 'https://example.com/shadow' }] });
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();

  // When
  await f.page.getByRole('button', { name: /입력 필요/ }).click();

  // Then
  assert.equal(f.writes('books').length, 0);
  await expect(f.page.locator('.manage-item').filter({ hasText: '표지 없음' })).toContainText('표지 필요');
});

test('U01-E04 경계: 읽기 링크가 없는 일반 책은 읽기 링크 필요 안내를 표시한다', async ({ profileMaterial: f }) => {
  // Given
  f.seed({ books: [{ id: 'no-listen', series: 'Oxford', title: '읽기 없음', cover: 'data:image/jpeg;base64,AA==', audio_listen: '', audio_shadow: 'https://example.com/shadow' }] });
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();

  // When
  await f.page.getByRole('button', { name: /입력 필요/ }).click();

  // Then
  assert.equal(f.writes('books').length, 0);
  await expect(f.page.locator('.manage-item').filter({ hasText: '읽기 없음' })).toContainText('읽기 링크 필요');
});

test('U01-E05 경계: 정따 링크가 없는 일반 책은 정따 링크 필요 안내를 표시한다', async ({ profileMaterial: f }) => {
  // Given
  f.seed({ books: [{ id: 'no-shadow', series: 'Oxford', title: '정따 없음', cover: 'data:image/jpeg;base64,BB==', audio_listen: 'https://example.com/read', audio_shadow: '' }] });
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();

  // When
  await f.page.getByRole('button', { name: /입력 필요/ }).click();

  // Then
  assert.equal(f.writes('books').length, 0);
  await expect(f.page.locator('.manage-item').filter({ hasText: '정따 없음' })).toContainText('정따 링크 필요');
});

test('U01-F01 잘못된 입력: 빈 아동 이름은 children 저장 요청을 만들지 않는다', async ({ profileMaterial: f }) => {
  // Given
  const childForm = f.page.locator('.profile-management-grid form');

  // When
  await childForm.getByRole('button', { name: '아동 추가', exact: true }).click();

  // Then
  assert.equal(f.writes('children').length, 0);
});

test('U01-F02 잘못된 입력: 일반 책의 필수 시리즈 누락은 books 저장 요청을 만들지 않는다', async ({ profileMaterial: f }) => {
  // Given
  await openParentBooks(f.page);
  const form = f.page.getByRole('region', { name: '자료 입력 양식' });
  await form.getByLabel('책 제목').fill('필수 시리즈 없음');
  await form.getByLabel('읽기 네이버 링크').fill('https://example.com/read');
  await form.getByLabel('정따 네이버 링크').fill('https://example.com/shadow');

  // When
  await form.getByRole('button', { name: '책 추가', exact: true }).click();

  // Then
  assert.equal(f.writes('books').length, 0);
});

test('U01-F03 잘못된 입력: 필수값이 모두 있어도 잘못된 URL은 books 저장 요청을 만들지 않고 오류를 표시한다', async ({ profileMaterial: f }) => {
  // Given
  await openParentBooks(f.page);
  const form = f.page.getByRole('region', { name: '자료 입력 양식' });
  await form.getByLabel('시리즈').fill('Oxford');
  await form.getByLabel('책 제목').fill('Bad URL');
  await form.getByLabel('읽기 네이버 링크').fill('ftp://example.com/read');
  await form.getByLabel('정따 네이버 링크').fill('https://example.com/shadow');

  // When
  await form.getByRole('button', { name: '책 추가', exact: true }).click();

  // Then
  assert.equal(f.writes('books').length, 0);
  await expect(f.page.getByText('링크는 http 또는 https 주소만 저장할 수 있습니다.')).toBeVisible();
});

test('U01-F04 실패: 아동 저장 HTTP 실패는 성공 목록에 반영하지 않고 실패 안내를 유지한다', async ({ profileMaterial: f }) => {
  // Given
  f.fail('children');
  const form = f.page.locator('.profile-management-grid form');
  await form.getByLabel('이름').fill('저장 실패 아동');

  // When
  await form.getByRole('button', { name: '아동 추가', exact: true }).click();

  // Then
  assert.equal(f.writes('children').length, 1);
  await expect(f.page.locator('.manage-list')).not.toContainText('저장 실패 아동');
  await expect(f.page.getByText('children 저장 실패')).toBeVisible();
});

test('U01-F05 실패: 빈 자료 목록을 불러온 뒤 자료 저장 HTTP 실패는 성공 목록에 반영하지 않고 실패 안내를 유지한다', async ({ profileMaterial: f }) => {
  // Given
  await openParentBooks(f.page);
  await f.page.getByRole('button', { name: '조회', exact: true }).click();
  await expect(f.page.locator('.manage-list')).toContainText('조건에 맞는 자료가 없습니다.');
  f.fail('books');

  // When
  await createBook(f.page, { series: 'Oxford', title: '저장 실패 책', listen: 'https://example.com/read', shadow: 'https://example.com/shadow' });

  // Then
  assert.equal(f.writes('books').length, 1);
  await expect(f.page.locator('.manage-list')).not.toContainText('저장 실패 책');
  await expect(f.page.getByText('books 저장 실패')).toBeVisible();
});
