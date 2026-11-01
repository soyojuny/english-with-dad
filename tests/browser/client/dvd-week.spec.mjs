import { test, expect } from '../support/client-fixture.mjs';

test('부모 DVD 목록은 모바일에서 다음 주로 이동한 뒤에도 상태를 유지한다', async ({ parentReport: f }) => {
  // Given
  f.seed({ children: [{ id: 'child-1', name: '민준', level: '1', goal: '' }], dvds: [
    { id: 'dvd-1', title: '첫 DVD', active: true },
    { id: 'dvd-2', title: '둘째 DVD', active: false },
  ] });
  const page = f.page;
  await page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();
  await page.getByRole('button', { name: 'DVD 관리', exact: true }).click();
  const first = page.getByRole('group', { name: '첫 DVD' });
  const second = page.getByRole('group', { name: '둘째 DVD' });
  await expect(first.getByText('보는 중', { exact: true })).toBeVisible();
  await expect(second.getByText('안 보는 중', { exact: true })).toBeVisible();

  // When
  await page.getByRole('button', { name: '부모', exact: true }).click();
  await page.getByRole('button', { name: '다음 기간' }).click();
  await expect(page.getByText('2026. 10/25(일) - 2026. 10/31(토)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'DVD 관리', exact: true }).click();

  // Then
  await expect(first.getByText('보는 중', { exact: true })).toBeVisible();
  await expect(second.getByText('안 보는 중', { exact: true })).toBeVisible();
  await expect(first.getByRole('button', { name: '안 보는 중으로 변경' })).toBeVisible();
  await expect(second.getByRole('button', { name: '보는 중으로 변경' })).toBeVisible();
});
