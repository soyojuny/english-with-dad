import { test, expect } from '../support/client-fixture.mjs';

function decor() { return { background: { itemId: 'lava-open-foreground', x: 50, y: 50 }, left: { itemId: 'ancient-dragon-relic', x: 82, y: 60 }, right: { itemId: 'lava-crystal', x: 15, y: 82 } }; }
async function dragonFixture(page, options = {}) {
  const freeItems = [
    ...['lava-open-foreground', 'lava-stone-platform', 'lava-central-volcano', 'lava-waterfall'].map((id, index) => ({ id, name: ['용암 계곡', '넓은 바위 터', '중앙 화산', '용암 폭포'][index], kind: 'background', art: id, free: true })),
    { id: 'ancient-dragon-relic', name: '고대 드래곤 석비', kind: 'prop', art: 'ancient-dragon-relic', free: true },
    { id: 'lava-crystal', name: '용암 수정', kind: 'prop', art: 'lava-crystal', free: true },
  ];
  const state = { today: '2026-10-18', credited: true, eligible: true, totalDays: 6, credits: 2,
    owned: freeItems.map(item => item.id), catalog: freeItems,
    dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element: null, decor: decor(), version: 0 }], ...options };
  let fail = false;
  await page.route('**/rest/v1/rpc/dragon_world', async route => {
    const { p_action: action, p_payload: payload } = route.request().postDataJSON();
    if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: '연결을 확인해 주세요.' }) });
    if (action === 'decorate') { const dragon = state.dragons.find(item => item.id === payload.id); dragon.decor = payload.decor; dragon.version++; }
      if (action === 'element') state.dragons.find(item => item.id === payload.id).element = payload.element;
    if (action === 'egg' && !state.dragons.some(item => item.id === payload.id)) state.dragons.push({ id: payload.id, egg: payload.egg, days: 0, element: null, decor: decor(), version: 0, selectedDate: state.today });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
  });
  return { state, fail(value) { fail = value; } };
}
async function openChild(page) {
  await page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await expect(page.getByRole('button', { name: '드래곤' })).toBeEnabled();
}
for (const width of [320, 390, 800, 1280]) {
  test(`드래곤 ${width}px: 배경 선택·기본 장식·자유 배치·저장과 복원`, async ({ childCompletion: f }, info) => {
    // Given
    const { page } = f; await page.setViewportSize({ width, height: 950 });
    const fixture = await dragonFixture(page); await openChild(page);
    await page.getByRole('button', { name: '드래곤' }).click();
    const dialog = page.getByRole('region', { name: '드래곤 키우기' });
    // When
    await expect(dialog.getByRole('button', { name: '둥지', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: '초록 숲 기본 제공' })).toHaveCount(0);
    for (const name of ['용암 계곡', '넓은 바위 터', '중앙 화산', '용암 폭포']) {
      await dialog.getByRole('button', { name: `${name} 기본 제공`, exact: true }).click();
      await dialog.locator('.dragon-background-art').evaluate(image => image.decode());
    }
    await dialog.getByRole('button', { name: '장식 1', exact: true }).click();
    await dialog.getByRole('button', { name: '용암 수정 기본 제공' }).click();
    await dialog.getByRole('button', { name: '왼쪽', exact: true }).click();
    const prop = dialog.getByRole('button', { name: /장식 1: 용암 수정/ });
    await prop.evaluate(element => element.scrollIntoView({ block: 'center' }));
    const box = await prop.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2 - 20, { steps: 4 }); await page.mouse.up();
    await dialog.getByRole('button', { name: '꾸미기 저장' }).click();
    // Then
    await expect.poll(() => fixture.state.dragons[0].version).toBe(1);
    expect(fixture.state.credits).toBe(2);
    expect(fixture.state.dragons[0].decor.left.x).toBeLessThan(79);
    expect(fixture.state.dragons[0].decor.left.y).toBeLessThan(60);
    await page.getByRole('button', { name: '오늘의 학습으로' }).click();
    await page.reload();
    if (await page.locator('.profile-grid').isVisible()) await openChild(page);
    await page.getByRole('button', { name: '드래곤' }).click();
    await expect(dialog.getByRole('button', { name: /장식 1: 용암 수정/ })).toHaveCSS('left', /px$/);
    const bounds = await dialog.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`dragon-${width}.png`), fullPage: true });
    await dialog.getByRole('button', { name: '장식 1', exact: true }).click();
    await dialog.getByRole('button', { name: '기본 위치' }).click();
    await dialog.getByRole('button', { name: '변경 취소' }).click();
    await expect(dialog.getByRole('button', { name: '꾸미기 저장' })).toBeDisabled();
  });
}

test('무료 원화 선택·저장과 학습 복귀, 기록 팝업 및 성체 원화 연결', async ({ childCompletion: f }, info) => {
  // Given: a first-release egg with supplied artwork and no reward credits.
  const { page } = f; await page.setViewportSize({ width: 1280, height: 950 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fixture = await dragonFixture(page, { totalDays: 0, credits: 0,
    dragons: [{ id: 'dragon-1', egg: 2, days: 0, selectedDate: '2026-10-18', element: null, decor: decor(), version: 0 }] });
  await openChild(page);
  // When: open a full page and choose free artwork.
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  const screen = page.getByRole('region', { name: '드래곤 키우기' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '오늘 해야 할 학습' })).toHaveCount(0);
  await screen.getByRole('button', { name: '배경', exact: true }).click();
  await screen.getByRole('button', { name: '넓은 바위 터 기본 제공', exact: true }).click();
  await screen.getByRole('button', { name: '장식 1', exact: true }).click();
  await screen.getByRole('button', { name: '고대 드래곤 석비 기본 제공', exact: true }).click();
  await screen.getByRole('button', { name: '장식 2', exact: true }).click();
  await screen.getByRole('button', { name: '용암 수정 기본 제공', exact: true }).click();
  await screen.getByRole('button', { name: '꾸미기 저장', exact: true }).click();
  // Then: free decoration persists without spending credits, and real artwork loads.
  await expect.poll(() => fixture.state.dragons[0].version).toBe(1);
  expect(fixture.state.credits).toBe(0);
  expect(fixture.state.dragons[0].decor.background.itemId).toBe('lava-stone-platform');
  await expect(screen.locator('.dragon-resident img')).toHaveAttribute('src', /eggs\/diamond.webp$/);
  await expect.poll(() => screen.locator('.dragon-scene img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('dragon-free-habitat.png'), fullPage: true });
  await page.getByRole('button', { name: '오늘의 학습으로' }).click();
  await expect(page.getByRole('button', { name: '드래곤', exact: true })).toBeFocused();
  await expect(page.getByRole('region', { name: '오늘 해야 할 학습' })).toBeVisible();
  await page.route('**/rest/v1/dvds?**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.getByRole('button', { name: '읽기·DVD 기록' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '닫기', exact: true }).click();
  fixture.state.dragons[0].days = 30; fixture.state.dragons[0].element = 'fire';
  await page.reload();
  if (await page.locator('.profile-grid').isVisible()) await openChild(page);
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  await expect(screen.locator('.dragon-resident img')).toHaveAttribute('src', /adult-fire.webp$/);
  await expect.poll(() => screen.locator('.dragon-resident img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('dragon-adult-habitat.png'), fullPage: true });
});

test('첫 알 미리보기와 늦은 속성 선택, 남은 학습 이동 및 저장 오류 재확인', async ({ childCompletion: f }) => {
  // Given
  const { page } = f; const fixture = await dragonFixture(page, { dragons: [], totalDays: 0, credits: 0 }); await openChild(page);
  // When
  await page.getByRole('button', { name: '드래곤' }).click();
  const dialog = page.getByRole('region', { name: '드래곤 키우기' });
  await expect(dialog.getByText('어떤 알이든 이런 아기로 만나요.')).toBeVisible();
  await dialog.getByRole('button', { name: '물결 무늬 알' }).click();
  // Then
  await expect(dialog.getByText('알을 선택한 다음 달성일부터 자라요.')).toBeVisible();
  expect(fixture.state.dragons[0].days).toBe(0);
  await page.getByRole('button', { name: '오늘의 학습으로' }).click();
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
  await page.getByRole('button', { name: '드래곤' }).click();
  await dialog.getByRole('button', { name: '얼음', exact: true }).click();
  await dialog.getByRole('button', { name: '얼음 속성으로 확정' }).click();
  await expect(dialog.getByRole('heading', { name: '얼음의 성체 드래곤 · 30/30일' })).toBeVisible();
});

test('프로필을 바꾸면 학습 화면으로 돌아가고 다른 아이의 드래곤을 표시하지 않는다', async ({ childCompletion: f }) => {
  // Given
  const { page } = f; const fixture = await dragonFixture(page); await openChild(page);
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  const screen = page.getByRole('region', { name: '드래곤 키우기' });
  await expect(screen.getByRole('heading', { name: '무속성 아기 드래곤 · 6/30일' })).toBeVisible();
  // When
  await page.getByRole('button', { name: '프로필 관리' }).click();
  fixture.state.dragons = []; fixture.state.eligible = false;
  await page.locator('.profile-grid').getByRole('button', { name: /서준/ }).click();
  // Then
  await expect(screen).toHaveCount(0);
  await expect(page.getByRole('region', { name: '오늘 해야 할 학습' })).toBeVisible();
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  await expect(screen.getByText(/오늘 배정된 학습을 모두 마치면/)).toBeVisible();
  await expect(screen.getByText('무속성 아기 드래곤 · 6/30일')).toHaveCount(0);
});

test('무속성 아기 동작과 움직임 줄이기', async ({ childCompletion: f }) => {
  // Given: a neutral baby and normal motion preferences.
  const { page } = f;
  const fixture = await dragonFixture(page);
  await openChild(page);
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  const resident = page.locator('.dragon-resident');
  const breath = resident.locator('.dragon-breath');
  const blink = resident.locator('.dragon-blink');
  // When / Then: approved layers load and animate with the intended timings.
  await expect(breath).toHaveCSS('animation-duration', '4s');
  await expect(blink).toHaveCSS('animation-duration', '6s');
  await expect.poll(() => resident.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(breath).toHaveCSS('animation-name', 'none');
  await expect(blink).toHaveCSS('opacity', '0');
  // Given / When: an elemental baby is loaded instead.
  fixture.state.dragons[0].element = 'fire';
  await page.reload();
  if (await page.locator('.profile-grid').isVisible()) await openChild(page);
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  // Then: neutral motion layers are absent.
  await expect(page.locator('.dragon-resident .dragon-motion-layer')).toHaveCount(0);
});
