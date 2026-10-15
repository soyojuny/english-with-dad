import { test, expect } from '../support/next-fixture.mjs';

test('A03-N04: 실제 Next는 Supabase 미설정 시 설정 안내 페이지를 반환한다', async ({ page, unconfiguredNextApp }) => {
  // Given
  const origin = unconfiguredNextApp.origin;

  // When
  const response = await page.goto(origin);

  // Then
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '환경 변수를 먼저 채워 주세요' })).toBeVisible();
  await expect(page.getByText('Supabase 설정 필요', { exact: true })).toBeVisible();
});

test('A03-N05: 실제 Next auth error 페이지는 로그인 오류와 홈 링크를 반환한다', async ({ page, nextApp }) => {
  // Given
  const origin = nextApp.origin;

  // When
  const response = await page.goto(`${origin}/auth/error`);

  // Then
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '인증 링크를 다시 확인해 주세요' })).toBeVisible();
  await expect(page.getByRole('link', { name: '로그인 화면으로 돌아가기' })).toHaveAttribute('href', '/');
});
