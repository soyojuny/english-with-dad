import { test, expect } from '../support/next-fixture.mjs';

test('T01-N05: 실제 Next 비로그인 SSR은 Google 로그인 화면을 반환한다', async ({ page, nextApp }) => {
  // Given
  const origin = nextApp.origin;

  // When
  const response = await page.goto(origin);
  const html = await response.text();

  // Then
  expect(response.status()).toBe(200);
  expect(html).toContain('Google로 로그인');
  await expect(page.getByRole('heading', { name: 'Google로 로그인' })).toBeVisible();
  expect(nextApp.auth.requests.filter(request => request.url.startsWith('/auth/'))).toEqual([]);
});

test('T01-N06: 실제 Next 로그인 SSR은 로컬 Auth HTTP를 호출하고 학습 shell을 반환한다', async ({ context, page, nextApp }) => {
  // Given: a synthetic SDK session, never a production credential.
  await context.addCookies([nextApp.auth.sessionCookie(nextApp.origin)]);

  // When
  const response = await page.goto(nextApp.origin);
  const html = await response.text();

  // Then
  expect(response.status()).toBe(200);
  expect(html).toContain('책 읽기 관리');
  expect(html).not.toContain('<h1>Google로 로그인</h1>');
  await expect(page.getByRole('heading', { name: '책 읽기 관리', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '사용할 프로필을 고르세요' })).toBeVisible();
  const serverAuth = nextApp.auth.requests.filter(request => request.url === '/auth/v1/user' && !request.browser);
  expect(serverAuth.length).toBeGreaterThanOrEqual(2); // middleware and async Page
  expect(serverAuth.every(request => request.authorized)).toBe(true);
});
