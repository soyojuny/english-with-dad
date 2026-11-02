import { test, expect } from '../support/client-fixture.mjs';

function decor() { return { background: { itemId: 'meadow', x: 50, y: 50 }, nest: { itemId: 'moss', x: 50, y: 78 }, left: { itemId: 'flowers', x: 22, y: 76 }, right: { itemId: null, x: 78, y: 76 } }; }
async function dragonFixture(page, options = {}) {
  const state = { today: '2026-10-18', credited: true, eligible: true, totalDays: 6, credits: 2,
    owned: ['meadow', 'moss', 'flowers'],
    catalog: [{ id: 'meadow', name: '초록 숲', kind: 'background', art: 'meadow', free: true },
      { id: 'moss', name: '이끼 둥지', kind: 'nest', art: 'moss', free: true },
      { id: 'flowers', name: '들꽃', kind: 'prop', art: 'flowers', free: true },
      { id: 'gem', name: '소원 수정', kind: 'prop', art: 'gem', free: false }],
    dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element: null, decor: decor(), version: 0 }], ...options };
  let fail = false;
  await page.route('**/rest/v1/rpc/dragon_world', async route => {
    const { p_action: action, p_payload: payload } = route.request().postDataJSON();
    if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: '연결을 확인해 주세요.' }) });
    if (action === 'decorate') { const dragon = state.dragons.find(item => item.id === payload.id); dragon.decor = payload.decor; dragon.version++; }
    if (action === 'claim' && !state.owned.includes(payload.itemId)) { state.owned.push(payload.itemId); state.credits--; }
    if (action === 'element') state.dragons.find(item => item.id === payload.id).element = payload.element;
    if (action === 'egg' && !state.dragons.some(item => item.id === payload.id)) state.dragons.push({ id: payload.id, egg: payload.egg, days: 0, element: null, decor: decor(), version: 0, selectedDate: state.today });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
  });
  return { state, fail(value) { fail = value; } };
}
async function openChild(page) {
  await page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await expect(page.getByRole('button', { name: /드래곤 보기 · 꾸미기/ })).toBeEnabled();
}
for (const width of [320, 390, 1280]) {
  test(`드래곤 ${width}px: 미리보기·소품 획득·자유 배치·저장과 복원`, async ({ childCompletion: f }, info) => {
    // Given
    const { page } = f; await page.setViewportSize({ width, height: 950 });
    const fixture = await dragonFixture(page); await openChild(page);
    await page.getByRole('button', { name: /드래곤 보기 · 꾸미기/ }).click();
    const dialog = page.getByRole('dialog', { name: '작은 드래곤의 숲' });
    // When
    await dialog.getByRole('button', { name: '소원 수정 미리보기' }).click();
    await expect(dialog.getByRole('button', { name: '꾸미기 저장' })).toBeDisabled();
    await dialog.getByRole('button', { name: '소원 수정 받기 · 기회 1개' }).click();
    await dialog.getByRole('button', { name: '오른쪽', exact: true }).click();
    const prop = dialog.getByRole('button', { name: /장식 1: 소원 수정/ });
    await prop.scrollIntoViewIfNeeded();
    const box = await prop.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 - 30, { steps: 4 }); await page.mouse.up();
    await dialog.getByRole('button', { name: '꾸미기 저장' }).click();
    // Then
    await expect.poll(() => fixture.state.dragons[0].version).toBe(1);
    expect(fixture.state.credits).toBe(1);
    expect(fixture.state.dragons[0].decor.left.x).toBeGreaterThan(25);
    expect(fixture.state.dragons[0].decor.left.y).toBeLessThan(76);
    await dialog.getByRole('button', { name: '드래곤 닫기' }).click();
    await page.reload();
    if (await page.locator('.profile-grid').isVisible()) await openChild(page);
    await page.getByRole('button', { name: /드래곤 보기 · 꾸미기/ }).click();
    await expect(dialog.getByRole('button', { name: /장식 1: 소원 수정/ })).toHaveCSS('left', /px$/);
    const bounds = await dialog.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    await dialog.screenshot({ path: info.outputPath(`dragon-${width}.png`) });
    await dialog.getByRole('button', { name: '기본 위치' }).click();
    await dialog.getByRole('button', { name: '변경 취소' }).click();
    await expect(dialog.getByRole('button', { name: '꾸미기 저장' })).toBeDisabled();
  });
}

test('첫 알 미리보기와 늦은 속성 선택, 남은 학습 이동 및 저장 오류 재확인', async ({ childCompletion: f }) => {
  // Given
  const { page } = f; const fixture = await dragonFixture(page, { dragons: [], totalDays: 0, credits: 0 }); await openChild(page);
  // When
  await page.getByRole('button', { name: /드래곤 보기 · 꾸미기/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('어떤 알이든 이런 아기로 만나요.')).toBeVisible();
  await dialog.getByRole('button', { name: '물결 무늬 알' }).click();
  // Then
  await expect(dialog.getByText('알을 선택한 다음 달성일부터 자라요.')).toBeVisible();
  expect(fixture.state.dragons[0].days).toBe(0);
  await dialog.getByRole('button', { name: '드래곤 닫기' }).click();
  await page.getByRole('button', { name: '오늘 완료 확인', exact: true }).click();
  const check = page.getByRole('region', { name: '오늘 완료 확인' });
  await expect(check.getByText(/이후 바뀐 학습/)).toBeVisible();
  await check.getByRole('button', { name: /다섯 활동 책 · 스스로 읽기/ }).click();
  await page.clock.runFor(32);
  await expect(page.locator('[data-task-type="self"] button').first()).toBeFocused();
  fixture.fail(true);
  await page.getByRole('button', { name: '오늘 완료 확인', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('드래곤 반영 결과를 확인하지 못했어요');
  fixture.fail(false); fixture.state.dragons[0].days = 30;
  await page.getByRole('button', { name: '반영 다시 확인' }).click();
  await page.getByRole('button', { name: /드래곤 보기 · 꾸미기/ }).click();
  await dialog.getByRole('button', { name: '얼음', exact: true }).click();
  await dialog.getByRole('button', { name: '얼음 속성으로 확정' }).click();
  await expect(dialog.getByRole('heading', { name: '얼음의 성체 드래곤 · 30/30일' })).toBeVisible();
});
