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
    dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element: null, decor: decor(), skills: [], version: 0 }], ...options };
  let fail = false;
  await page.route('**/rest/v1/rpc/dragon_world', async route => {
    const { p_action: action, p_payload: payload } = route.request().postDataJSON();
    if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: '연결을 확인해 주세요.' }) });
    if (action === 'skill') { const dragon = state.dragons.find(item => item.id === payload.id); if (!dragon.skills.includes(payload.skill)) { dragon.skills.push(payload.skill); state.credits--; } }
    if (action === 'decorate') { const dragon = state.dragons.find(item => item.id === payload.id); dragon.decor = payload.decor; dragon.version++; }
      if (action === 'element') state.dragons.find(item => item.id === payload.id).element = payload.element;
    if (action === 'egg' && !state.dragons.some(item => item.id === payload.id)) state.dragons.push({ id: payload.id, egg: payload.egg, days: 0, element: null, decor: decor(), skills: [], version: 0, selectedDate: state.today });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
  });
  return { state, fail(value) { fail = value; } };
}
async function openChild(page) {
  await page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await expect(page.getByRole('button', { name: '드래곤' })).toBeEnabled();
}

test('무속성 아기: 서기·호흡·깜빡임·걷기·앉기 시작의 날개 틈은 투명하다', async ({ childCompletion: f }) => {
  // Given: the production WebP assets loaded from the actual app origin.
  const samples = [
    ['neutral', 443, 498], ['blink', 443, 498], ['breathe', 443, 498],
    ['walk-bde', 335, 298], ['walk-bde', 1128, 293], ['walk-bde', 1948, 301],
    ['sit-sequence', 443, 498],
  ];
  // When: reading a 3×3 patch inside each formerly white opening.
  const alpha = await f.page.evaluate(async samples => Promise.all(samples.map(async ([name, x, y]) => {
    const image = new Image(); image.src = `/assets/dragons/baby/${name}.webp`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(x - 1, y - 1, 3, 3).data;
    return Math.max(...Array.from(pixels).filter((_, index) => index % 4 === 3));
  })), samples);
  // Then: the habitat can show through every opening, including all walking frames.
  expect(alpha).toEqual(samples.map(() => 0));
});

test('불 아기 정지 원화와 호흡·깜빡임은 밝은 배경 테두리와 날개 틈을 표시하지 않는다', async ({ childCompletion: f }) => {
  // Given: the actual deployed idle assets, including the breathing peak layer.
  const names = ['fire', 'fire-breathe', 'fire-blink'];
  // When: sampling the formerly opaque pale neck/horn edge and enclosed wing opening.
  const samples = await f.page.evaluate(async names => Promise.all(names.map(async name => {
    const image = new Image(); image.src = `/assets/dragons/baby/${name}.webp`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return { edge: [[637, 297], [705, 215]].map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]),
      gap: context.getImageData(443, 498, 1, 1).data[3] };
  })), names);
  // Then: resizing may leave faint antialiasing, but the white matte is transparent.
  for (const sample of samples) {
    expect(sample.gap).toBe(0);
    for (const alpha of sample.edge) expect(alpha).toBeLessThan(32);
  }
  await dragonFixture(f.page, { dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element: 'fire', decor: decor(), skills: [], version: 0 }] });
  await openChild(f.page);
  await f.page.getByRole('button', { name: '드래곤', exact: true }).click();
  const scene = f.page.getByLabel('드래곤의 공간');
  await scene.locator('.dragon-breath').evaluate(element => {
    const animation = element.getAnimations()[0]; animation.pause(); animation.currentTime = 2000;
  });
  for (const width of [390, 1280]) {
    await f.page.setViewportSize({ width, height: 950 });
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator('.dragon-breath')).toHaveCSS('opacity', '1');
  }
});

for (const element of [null, 'fire', 'thunder', 'ice']) {
for (const width of [390, 1280]) {
  test(`${element === 'ice' ? '얼음' : element === 'thunder' ? '번개' : element === 'fire' ? '불' : '무속성'} 아기 ${width}px: 스틱 이동과 정지`, async ({ childCompletion: f }) => {
    // Given
    const { page } = f; await page.setViewportSize({ width, height: 950 });
    await dragonFixture(page, { dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element, decor: decor(), skills: [], version: 0 }] }); await openChild(page);
    await page.getByRole('button', { name: '드래곤', exact: true }).click();
    const scene = page.getByLabel('드래곤의 공간');
    await scene.scrollIntoViewIfNeeded();
    const box = await scene.boundingBox();
    const resident = scene.locator('.dragon-resident');
    const before = await resident.evaluate(el => parseFloat(el.style.left));
    // When
    const x = box.x + box.width * .5, y = box.y + box.height * .5;
    const cdp = width === 390 ? await page.context().newCDPSession(page) : null;
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 50, y }] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 50, y);
    }
    await expect(scene.locator('.dragon-stick')).toBeVisible();
    await page.clock.runFor(300);
    await expect.poll(() => resident.evaluate(el => parseFloat(el.style.left))).toBeGreaterThan(before);
    // Then: the approved B→D→E sheet advances at 5fps, with no standing frame or blending.
    const walk = scene.locator('.dragon-walk-frame');
    await expect(walk).toHaveCSS('animation-duration', '0.6s');
    await expect(walk).toHaveCSS('filter', 'none');
    const walkPath = `/assets/dragons/baby/${element ? `${element}-` : ''}walk-bde.webp`;
    await expect(walk).toHaveCSS('background-image', new RegExp(walkPath.replaceAll('.', '\\.')));
    const animation = await walk.evaluate(async (element, path) => {
      const image = new Image(); image.src = path; await image.decode();
      const motion = element.getAnimations()[0]; motion.pause();
      const positions = [];
      for (const time of [0, 199, 200, 399, 401, 599, 600]) {
        motion.currentTime = time;
        positions.push(getComputedStyle(element).backgroundPositionX);
      }
      motion.play();
      return { width: image.naturalWidth, height: image.naturalHeight, positions };
    }, walkPath);
    expect(animation).toEqual({ width: 2400, height: 620,
      positions: ['0%', '0%', '50%', '50%', '100%', '100%', '0%'] });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(scene.locator('.dragon-walk')).toBeHidden();
    await expect(scene.locator('.dragon-idle')).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const during = await resident.evaluate(el => parseFloat(el.style.left));
    for (let step = 1; step <= 20; step++) {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 50 + step, y }] });
      else await page.mouse.move(x + 50 + step, y);
      await page.clock.runFor(8);
    }
    expect(await resident.evaluate(el => parseFloat(el.style.left))).toBeGreaterThan(during + 1);
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
    // Then
    await expect(scene.locator('.dragon-stick')).toHaveCount(0);
    await expect(scene.locator('.dragon-walk')).toHaveCount(0);
    await page.clock.runFor(5000);
    await expect(scene.getByLabel('쉬는 아기 드래곤')).toBeVisible();
    const sitting = scene.locator('.dragon-sit');
    await expect(sitting).toHaveCSS('background-position-x', '0%');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(sitting).toHaveCSS('background-position-x', '100%');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(sitting).toHaveCSS('background-position-x', '0%');
    const sitPath = `/assets/dragons/baby/${element ? `${element}-` : ''}sit-sequence.webp`;
    const sitSheet = await sitting.evaluate(async (element, path) => {
      const image = new Image(); image.src = path; await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight, background: getComputedStyle(element).backgroundImage };
    }, sitPath);
    expect(sitSheet.width).toBe(element === 'ice' ? 4096 : 5120); expect(sitSheet.height).toBe(1024);
    expect(sitSheet.background).toContain(sitPath);
    const positions = element === 'ice' ? ['33.3333%', '66.6667%', '100%'] : ['25%', '50%', '75%', '100%'];
    await expect(sitting).toHaveCSS('background-size', element === 'ice' ? '400% 100%' : '500% 100%');
    await page.clock.runFor(299); await expect(sitting).toHaveCSS('background-position-x', '0%');
    await page.clock.runFor(1); await expect(sitting).toHaveCSS('background-position-x', positions[0]);
    for (const position of positions.slice(1)) {
      await page.clock.runFor(300); await expect(sitting).toHaveCSS('background-position-x', position);
    }
    await expect(sitting).toHaveClass(/is-seated/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(sitting).toHaveCSS('background-position-x', '100%');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scene.click({ position: { x: 10, y: 10 } });
    await expect(sitting).toHaveClass(/is-rising/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(sitting).toHaveCSS('background-position-x', '0%');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const position of positions.slice(0, -1).reverse()) {
      await page.clock.runFor(300); await expect(sitting).toHaveCSS('background-position-x', position);
    }
    await page.clock.runFor(300);
    await expect(sitting).toHaveCount(0);
    await expect(scene.locator('.dragon-idle')).toBeVisible();
    if (element === 'fire' || element === 'thunder' || element === 'ice') {
      await expect(scene.locator('.dragon-idle img').first()).toHaveAttribute('src', `/assets/dragons/baby/${element}.webp`);
      await expect(scene.locator('.dragon-breath')).toHaveAttribute('src', `/assets/dragons/baby/${element}-breathe.webp`);
      await expect(scene.locator('.dragon-blink')).toHaveAttribute('src', `/assets/dragons/baby/${element}-blink.webp`);
      await page.getByRole('button', { name: '공간 꾸미기', exact: true }).click();
      await expect(scene).not.toHaveClass(/is-controllable/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
}
for (const width of [320, 390, 800, 1280]) {
  test(`드래곤 ${width}px: 배경 선택·기본 장식·자유 배치·저장과 복원`, async ({ childCompletion: f }) => {
    // Given
    const { page } = f; await page.setViewportSize({ width, height: 950 });
    const fixture = await dragonFixture(page); await openChild(page);
    await page.getByRole('button', { name: '드래곤' }).click();
    const dialog = page.getByRole('region', { name: '드래곤 키우기' });
    // When
    await expect(dialog.locator('.dragon-tools')).toHaveCount(0);
    await dialog.getByRole('button', { name: '공간 꾸미기', exact: true }).click();
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
    await dialog.getByRole('button', { name: '공간 꾸미기', exact: true }).click();
    await dialog.getByRole('button', { name: '장식 1', exact: true }).click();
    await dialog.getByRole('button', { name: '기본 위치' }).click();
    await dialog.getByRole('button', { name: '변경 취소', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '꾸미기 저장' })).toBeDisabled();
  });
}

test('무료 원화 선택·저장과 학습 복귀, 기록 팝업 및 성체 원화 연결', async ({ childCompletion: f }) => {
  // Given: a first-release egg with supplied artwork and no reward credits.
  const { page } = f; await page.setViewportSize({ width: 1280, height: 950 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fixture = await dragonFixture(page, { totalDays: 0, credits: 0,
    dragons: [{ id: 'dragon-1', egg: 2, days: 0, selectedDate: '2026-10-18', element: null, decor: decor(), skills: [], version: 0 }] });
  await openChild(page);
  // When: open a full page and choose free artwork.
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  const screen = page.getByRole('region', { name: '드래곤 키우기' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '오늘 해야 할 학습' })).toHaveCount(0);
  await screen.getByRole('button', { name: '공간 꾸미기', exact: true }).click();
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

test('속성별 아기 동작과 움직임 줄이기', async ({ childCompletion: f }) => {
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
  // Given / When: each elemental baby is loaded instead.
  for (const element of ['fire', 'thunder', 'ice']) {
    fixture.state.dragons[0].element = element;
    await page.reload();
    if (await page.locator('.profile-grid').isVisible()) await openChild(page);
    await page.getByRole('button', { name: '드래곤', exact: true }).click();
    // Then: its own approved layers load and motion reduction remains respected.
    await expect(page.locator('.dragon-resident .dragon-breath')).toHaveAttribute('src', `/assets/dragons/baby/${element}-breathe.webp`);
    await expect(page.locator('.dragon-resident .dragon-blink')).toHaveAttribute('src', `/assets/dragons/baby/${element}-blink.webp`);
    await expect.poll(() => page.locator('.dragon-resident img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await expect(page.locator('.dragon-resident .dragon-breath')).toHaveCSS('animation-name', 'none');
  }
  fixture.state.dragons[0].days = 18;
  await page.reload();
  if (await page.locator('.profile-grid').isVisible()) await openChild(page);
  await page.getByRole('button', { name: '드래곤', exact: true }).click();
  await expect(page.locator('.dragon-resident .dragon-motion-layer')).toHaveCount(0);
});

for (const element of [null, 'fire', 'thunder']) {
for (const width of [390, 1280]) {
  test(`날기 ${element ?? '무속성'} ${width}px: 보상 획득과 재조회, 이륙·좌우 비행·대기·역순 착륙`, async ({ childCompletion: f }) => {
    // Given
    const { page } = f; await page.setViewportSize({ width, height: 950 });
    const fixture = await dragonFixture(page);
    fixture.state.dragons[0].element = element;
    await openChild(page);
    await page.getByRole('button', { name: '드래곤', exact: true }).click();
    const screen = page.getByRole('region', { name: '드래곤 키우기' });
    await expect(screen.getByRole('button', { name: '날기', exact: true })).toHaveCount(0);
    // When: acquire once, then load the persisted skill again.
    await screen.getByRole('button', { name: '날기 배우기 · 기회 1개' }).click();
    await expect(screen.getByRole('button', { name: '날기', exact: true })).toBeVisible();
    expect(fixture.state.credits).toBe(1);
    // Reload restores the saved child asynchronously; wait for its action instead
    // of clicking a profile card that can disappear during automatic restoration.
    await page.reload();
    await page.getByRole('button', { name: '드래곤', exact: true }).click();
    await screen.getByRole('button', { name: '날기', exact: true }).click();
    await expect(screen.getByRole('button', { name: '날아오르는 중' })).toBeDisabled();
    await expect(page.locator('.dragon-flight-frame')).toHaveCSS('background-size', element ? '400% 200%' : '600% 500%');
    if (element === 'thunder') {
      // Then: preparation lowers the body before a visible, interpolated lift.
      const resident = page.locator('.dragon-resident');
      await expect(resident).toHaveCSS('transition-property', 'top');
      await page.clock.runFor(120);
      expect(await resident.evaluate(el => parseFloat(el.style.top))).toBe(66);
      await page.clock.runFor(240);
      expect(await resident.evaluate(el => parseFloat(el.style.top))).toBeLessThan(65);
    }
    await page.clock.runFor(element === 'thunder' ? 800 : element === 'fire' ? 1100 : 2700);
    const scene = page.getByLabel('드래곤의 공간');
    await expect(scene.getByLabel('공중에 머무는 아기 드래곤')).toBeVisible();
    const resident = scene.locator('.dragon-resident');
    await expect(scene.locator('.dragon-flight-frame')).toHaveCSS('background-image', new RegExp(element ? `${element}-flight-move` : 'flight-hover'));
    const top = await resident.evaluate(el => el.style.top);
    if (element === 'thunder') {
      expect(top).toBe('37%');
      expect(Number(await scene.locator('.dragon-flight-shadow').evaluate(el => el.style.opacity))).toBeLessThan(.5);
    }
    await scene.scrollIntoViewIfNeeded();
    const box = await scene.boundingBox(), x = box.x + box.width * .5, y = box.y + box.height * .6;
    const initialX = await resident.evaluate(el => parseFloat(el.style.left));
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 45, y);
    await page.clock.runFor(300);
    await expect(scene.getByLabel('비행하는 아기 드래곤')).toBeVisible();
    expect(await resident.evaluate(el => parseFloat(el.style.left))).toBeGreaterThan(initialX);
    await page.mouse.move(x - 45, y); await page.clock.runFor(300);
    await expect(resident).toHaveCSS('transform', /matrix\(-1,/);
    await page.clock.runFor(5000);
    expect(await resident.evaluate(el => parseFloat(el.style.left))).toBe(25);
    await page.mouse.move(x + 45, y); await page.clock.runFor(5000);
    expect(await resident.evaluate(el => parseFloat(el.style.left))).toBe(74);
    await page.mouse.up(); await page.clock.runFor(6000);
    // Then: stay airborne without sitting or moving vertically; assets have a clear background.
    await expect(scene.getByLabel('공중에 머무는 아기 드래곤')).toBeVisible();
    await expect(scene.locator('.dragon-sit')).toHaveCount(0);
    expect(await resident.evaluate(el => el.style.top)).toBe(top);
    const alpha = await page.evaluate(async (prefix) => {
      const img = new Image(); img.src = `/assets/dragons/baby/${prefix}flight-takeoff.webp`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
      const context = canvas.getContext('2d'); context.drawImage(img, 0, 0);
      return context.getImageData(0, 0, 1, 1).data[3];
    }, element ? `${element}-` : '');
    expect(alpha).toBe(0);
    await screen.getByRole('button', { name: '날기', exact: true }).click();
    await expect(scene.getByLabel('착륙하는 아기 드래곤')).toBeVisible();
    await page.clock.runFor(element === 'thunder' ? 800 : element === 'fire' ? 1100 : 2700);
    await expect(scene.locator('.dragon-flight')).toHaveCount(0);
    expect(await resident.evaluate(el => el.style.top)).toBe('65%');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
}

for (const element of [null, 'fire', 'thunder']) {
test(`날기 ${element ?? '무속성'}: 움직임 줄이기와 꾸미기 진입은 반복 동작을 중단한다`, async ({ childCompletion: f }) => {
  // Given
  const { page } = f; await page.emulateMedia({ reducedMotion: 'reduce' });
  await dragonFixture(page, { dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element, decor: decor(), skills: ['fly'], version: 0 }] });
  await openChild(page); await page.getByRole('button', { name: '드래곤', exact: true }).click();
  // When
  await page.getByRole('button', { name: '날기', exact: true }).click();
  const frame = page.locator('.dragon-flight-frame');
  await expect(frame).toBeVisible();
  const position = await frame.evaluate(el => el.style.backgroundPosition);
  await page.clock.runFor(1000);
  // Then
  expect(await frame.evaluate(el => el.style.backgroundPosition)).toBe(position);
  await page.getByRole('button', { name: '공간 꾸미기', exact: true }).click();
  await expect(page.locator('.dragon-flight')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '날기', exact: true })).toHaveCount(0);
});
}

for (const width of [390, 1280]) {
  test(`번개 꼬리 공격 ${width}px: 3일 보상 기회로 획득하고 43프레임 공격 후 서기로 복귀`, async ({ childCompletion: f }) => {
    // Given: two choices earned from six days, shared by flight and tail attack.
    const { page } = f; await page.setViewportSize({ width, height: 950 });
    const fixture = await dragonFixture(page, { dragons: [{ id: 'dragon-1', egg: 0, days: 6, selectedDate: '2026-10-01', element: 'thunder', decor: decor(), skills: [], version: 0 }] });
    await openChild(page); await page.getByRole('button', { name: '드래곤', exact: true }).click();
    await expect(page.getByRole('button', { name: '꼬리 공격', exact: true })).toHaveCount(0);
    // When
    await page.getByRole('button', { name: '꼬리 공격 배우기 · 기회 1개' }).click();
    await page.getByRole('button', { name: '날기 배우기 · 기회 1개' }).click();
    // Then: both skills persist in the server snapshot and share the choice balance.
    expect(fixture.state.credits).toBe(0);
    expect(fixture.state.dragons[0].skills).toEqual(['tail-attack', 'fly']);
    const attackButton = page.getByRole('button', { name: '꼬리 공격', exact: true });
    const scene = page.getByLabel('드래곤의 공간');
    const resident = scene.locator('.dragon-resident');
    const before = await resident.getAttribute('style');
    await attackButton.click();
    const attack = scene.locator('.dragon-tail-attack-frame');
    await expect(attack).toHaveCSS('background-size', '600% 800%');
    await expect(attack).toHaveCSS('background-position', '0% 0%');
    const dimensions = await page.evaluate(async () => {
      const image = new Image(); image.src = '/assets/dragons/baby/thunder-tail-attack.webp'; await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    });
    expect(dimensions).toEqual([3606, 2888]);
    await expect(page.getByRole('button', { name: '꼬리 공격 중' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '날기', exact: true })).toBeDisabled();
    const box = await scene.boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5); await page.mouse.up();
    await expect(scene.locator('.dragon-stick')).toHaveCount(0);
    for (let frame = 1; frame <= 42; frame++) await page.clock.runFor(56);
    await expect(attack).toHaveCSS('background-position', '0% 100%');
    expect(await resident.getAttribute('style')).toBe(before);
    await page.clock.runFor(56);
    await expect(attack).toHaveCount(0); await expect(scene.locator('.dragon-idle')).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await attackButton.click();
    await expect(attack).toHaveCSS('background-position', '0% 57.1429%');
    await page.clock.runFor(300); await expect(attack).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: '날기', exact: true }).click();
    await expect(attackButton).toBeDisabled();
    await page.clock.runFor(700);
    await page.getByRole('button', { name: '날기', exact: true }).click();
    await page.clock.runFor(700); await expect(attackButton).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
