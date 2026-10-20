import { test, expect } from '../support/client-fixture.mjs';

async function openChild(f) {
  const books = Array.from({ length: 24 }, (_, index) => ({
    id: `log-book-${index}`, series: '긴 목록', title: `오늘 읽을 책 ${index + 1}`,
  }));
  f.seed({
    children: [{ id: 'child-1', name: '민준', level: '2', goal: '매일 읽기' }],
    books,
    assignments: books.map((book, index) => ({
      id: `log-assignment-${index}`, child_id: 'child-1', date: '2026-10-18',
      book_id: book.id, activity_category: 'readAloud', tasks: ['self'], task_counts: { self: 1 },
    })),
  });
  await f.page.reload();
  await f.page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
  await expect(f.page.locator('.assignment-card')).toHaveCount(24);
  return f.page.getByRole('button', { name: '읽은 책 기록', exact: true });
}

async function geometry(dialog) {
  return dialog.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
      scrollY, documentHeight: document.documentElement.scrollHeight };
  });
}

async function expectReachable(control) {
  const box = await control.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
      reachable: hit === element || element.contains(hit) };
  });
  expectViewport(box);
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(box.reachable).toBe(true);
}

async function expectTextClear(dialog) {
  const issues = await dialog.evaluate(root => {
    const controls = [...root.querySelectorAll('button, input, select')];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const problems = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement.closest('option')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        const box = root.getBoundingClientRect();
        if (rect.left < box.left - 1 || rect.right > box.right + 1) problems.push('text overflows dialog');
        for (const control of controls) {
          if (control.contains(node)) continue;
          const other = control.getBoundingClientRect();
          if (Math.min(rect.right, other.right) - Math.max(rect.left, other.left) > 1
            && Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top) > 1) problems.push('text overlaps control');
        }
      }
    }
    return problems;
  });
  expect(issues).toEqual([]);
}

function expectViewport(box) {
  expect(box.top, '팝업 상단은 현재 viewport 안에 있어야 한다').toBeGreaterThanOrEqual(0);
  expect(box.bottom, '팝업 하단은 현재 viewport 안에 있어야 한다').toBeLessThanOrEqual(box.viewportHeight + 1);
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(box.viewportWidth);
}

for (const width of [360, 390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('정상: 긴 과제 목록에서 읽은 책 팝업은 자동 스크롤 전에 viewport 중앙에 열린다', async ({ parentReport: f }, testInfo) => {
      // Given
      const trigger = await openChild(f);
      await trigger.scrollIntoViewIfNeeded();
      const before = await f.page.evaluate(() => scrollY);

      // When
      await trigger.click();
      const dialog = f.page.locator('.quick-log-dialog');
      // Read geometry before any dialog control action can cause Playwright to scroll.
      const box = await geometry(dialog);
      await testInfo.attach('opening-geometry', { body: JSON.stringify({ before, ...box }, null, 2), contentType: 'application/json' });

      // Then
      expectViewport(box);
      expect(Math.abs(box.scrollY - before), '팝업 열기는 배경 페이지를 이동시키지 않아야 한다').toBeLessThanOrEqual(1);
      expect(Math.abs((box.top + box.bottom) / 2 - box.viewportHeight / 2)).toBeLessThanOrEqual(2);
      for (const control of await dialog.locator('button, input, select').all()) await expectReachable(control);
      await expectTextClear(dialog);
      expect(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });
  });
}

for (const action of ['닫기', '취소', 'Escape']) {
  test(`정상: 스크롤된 페이지에서 ${action} 후 위치와 진입 포커스를 복원하고 다시 연다`, async ({ parentReport: f }) => {
    // Given
    const trigger = await openChild(f);
    await trigger.evaluate(element => {
      const headerBottom = document.querySelector('.topbar').getBoundingClientRect().bottom;
      window.scrollTo(0, element.getBoundingClientRect().top + scrollY - headerBottom - 16);
    });
    await expectReachable(trigger);
    const before = await f.page.evaluate(() => scrollY);
    expect(before).toBeGreaterThan(0);
    await trigger.click();
    const dialog = f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true });
    expectViewport(await geometry(dialog));
    expect(await f.page.evaluate(() => scrollY)).toBe(before);

    // When
    if (action === 'Escape') await f.page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: action, exact: true }).click();

    // Then
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await f.page.evaluate(() => scrollY)).toBe(before);
    await f.page.mouse.move(8, 8);
    await f.page.mouse.wheel(0, 150);
    await expect.poll(() => f.page.evaluate(() => scrollY)).toBeGreaterThan(before);
    await trigger.click();
    expectViewport(await geometry(dialog));
    await expect(dialog.getByLabel('제목', { exact: true })).toBeFocused();
  });
}

test('정상: 초기 제목 포커스와 양방향 Tab은 배경에 가지 않으며 배경 클릭·스크롤을 차단한다', async ({ parentReport: f }, testInfo) => {
  // Given
  const trigger = await openChild(f);
  const profile = f.page.getByRole('button', { name: '프로필 관리', exact: true });
  const profileBox = await profile.boundingBox();
  await trigger.click();
  const dialog = f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true });
  const before = await f.page.evaluate(() => scrollY);

  // When
  await expect(dialog.getByLabel('제목', { exact: true })).toBeFocused();
  const focusSteps = [];
  for (const key of [...Array(12).fill('Tab'), ...Array(12).fill('Shift+Tab')]) {
    await f.page.keyboard.press(key);
    const focus = await dialog.evaluate(element => ({ within: element.contains(document.activeElement),
      active: document.activeElement.tagName, documentFocused: document.hasFocus() }));
    focusSteps.push({ key, ...focus });
    // Native Tab may visit browser chrome; it must never focus a background page control.
    expect(focus.within || (focus.active === 'BODY' && !focus.documentFocused), JSON.stringify(focus)).toBe(true);
  }
  await testInfo.attach('native-tab-focus', { body: JSON.stringify(focusSteps, null, 2), contentType: 'application/json' });
  await dialog.getByLabel('제목', { exact: true }).focus();
  await profile.evaluate(element => element.focus());
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await f.page.mouse.click(profileBox.x + profileBox.width / 2, profileBox.y + profileBox.height / 2);
  await f.page.mouse.move(8, 8);
  await f.page.mouse.wheel(0, 600);
  await f.page.clock.runFor(100);

  // Then
  await expect(dialog).toBeVisible();
  await expect(f.page.locator('.profile-grid')).toHaveCount(0);
  expect(await f.page.evaluate(() => scrollY)).toBe(before);
  expect(f.writes('manual_logs')).toHaveLength(0);
});

test('경계: 짧은 360px 화면은 팝업 내부를 스크롤해 입력과 하단 버튼에 접근한다', async ({ parentReport: f }) => {
  // Given
  await f.page.setViewportSize({ width: 360, height: 320 });
  const trigger = await openChild(f);
  await trigger.click();
  const dialog = f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true });
  expectViewport(await geometry(dialog));
  const before = await f.page.evaluate(() => scrollY);

  // When
  const title = dialog.getByLabel('제목', { exact: true });
  await title.fill('짧은 화면 동화');
  await title.scrollIntoViewIfNeeded();
  await expectReachable(title);
  const minutes = dialog.getByLabel('시간', { exact: true });
  await minutes.fill('15');
  await minutes.scrollIntoViewIfNeeded();
  await expectReachable(minutes);
  for (const name of ['기록 추가', '취소', '닫기']) {
    const button = dialog.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    await expectReachable(button);
  }

  // Then
  expect(await dialog.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await expect(title).toHaveValue('짧은 화면 동화');
  await expect(minutes).toHaveValue('15');
  expect(await f.page.evaluate(() => scrollY)).toBe(before);
  expect(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('잘못된 입력: 빈 제목은 모달과 다른 입력을 유지하고 저장하지 않는다', async ({ parentReport: f }) => {
  // Given
  await (await openChild(f)).click();
  const dialog = f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true });
  await dialog.getByLabel('구분').selectOption('englishPicture');
  await dialog.getByLabel('시간', { exact: true }).fill('15');

  // When
  await dialog.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('제목', { exact: true })).toBeFocused();
  await expect(dialog.getByLabel('구분')).toHaveValue('englishPicture');
  await expect(dialog.getByLabel('시간', { exact: true })).toHaveValue('15');
  expect(f.writes('manual_logs')).toHaveLength(0);
});

test('실패: 저장 오류는 모달 안에서 읽을 수 있고 입력을 유지하며 재시도 성공 후 다시 연다', async ({ parentReport: f }) => {
  // Given
  const trigger = await openChild(f);
  await trigger.click();
  const dialog = f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true });
  await dialog.getByLabel('제목', { exact: true }).fill('저장 실패 동화');
  await dialog.getByLabel('구분').selectOption('englishPicture');
  await dialog.getByLabel('시간', { exact: true }).fill('15');
  f.fail('manual_logs:POST');

  // When
  await dialog.getByRole('button', { name: '기록 추가', exact: true }).click();

  // Then
  await expect(dialog.getByText('manual_logs 테스트 실패', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('제목', { exact: true })).toHaveValue('저장 실패 동화');
  await expect(dialog.getByLabel('구분')).toHaveValue('englishPicture');
  await expect(dialog.getByLabel('시간', { exact: true })).toHaveValue('15');
  expect(f.state.manual_logs).toHaveLength(0);
  expect(f.writes('manual_logs')).toHaveLength(1);
  f.recover('manual_logs:POST');
  await dialog.getByRole('button', { name: '기록 추가', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(f.page.getByText('읽은 책 기록을 추가했습니다.', { exact: true })).toBeVisible();
  await trigger.click();
  await expect(dialog.getByLabel('제목', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('제목', { exact: true })).toBeFocused();
});

test('경계: 열린 모달을 unmount하면 오류 없이 기존 스크롤 스타일과 배경 조작을 복원한다', async ({ parentReport: f }) => {
  // Given
  const errors = [];
  f.page.on('pageerror', error => errors.push(error.message));
  const trigger = await openChild(f);
  const before = await f.page.evaluate(() => {
    document.body.style.overflow = 'scroll';
    document.documentElement.style.overflow = 'auto';
    return { body: document.body.style.overflow, html: document.documentElement.style.overflow };
  });
  await trigger.click();
  await expect(f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true })).toBeVisible();

  // When
  await f.page.evaluate(() => window.__unmountReadingManager());

  // Then
  await expect(f.page.locator('dialog')).toHaveCount(0);
  expect(await f.page.evaluate(() => ({ body: document.body.style.overflow,
    html: document.documentElement.style.overflow }))).toEqual(before);
  await f.page.evaluate(() => {
    const button = document.createElement('button');
    button.textContent = 'unmount 이후 버튼';
    button.onclick = () => { button.textContent = '배경 클릭 성공'; };
    document.body.append(button);
  });
  await f.page.getByRole('button', { name: 'unmount 이후 버튼', exact: true }).click();
  await expect(f.page.getByRole('button', { name: '배경 클릭 성공', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

const strictTest = test.extend({ clientStrictMode: true });

strictTest.describe('StrictMode lifecycle', () => {
  strictTest('경계: effect 재실행의 지연 close 이후에도 모달을 유지하고 종료·재열기 상태를 복원한다', async ({ parentReport: f }) => {
    // Given
    const errors = [];
    f.page.on('pageerror', error => errors.push(error.message));
    const trigger = await openChild(f);
    await trigger.evaluate(element => {
      const headerBottom = document.querySelector('.topbar').getBoundingClientRect().bottom;
      window.scrollTo(0, element.getBoundingClientRect().top + scrollY - headerBottom - 16);
    });
    await expectReachable(trigger);
    const before = await f.page.evaluate(() => {
      document.body.style.overflow = 'scroll';
      document.documentElement.style.overflow = 'auto';
      window.__strictClosedDialogs = [];
      document.addEventListener('close', event => {
        if (event.target instanceof HTMLDialogElement) window.__strictClosedDialogs.push(event.target);
      }, true);
      return { body: document.body.style.overflow, html: document.documentElement.style.overflow, scrollY };
    });

    // When
    await trigger.click();
    const dialog = f.page.getByRole('dialog', { name: '읽은 책 추가', exact: true });
    // Native close is queued by StrictMode cleanup. Observe its delivery on the same DOM dialog.
    await f.page.clock.runFor(100);
    await expect.poll(() => dialog.evaluate(element => window.__strictClosedDialogs.includes(element))).toBe(true);

    // Then
    expect(await dialog.evaluate(element => element.open && element.matches(':modal'))).toBe(true);
    expectViewport(await geometry(dialog));
    await expect(dialog.getByLabel('제목', { exact: true })).toBeFocused();
    expect(await f.page.evaluate(() => scrollY)).toBe(before.scrollY);
    await f.page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await f.page.clock.runFor(100);
    await expect(trigger).toBeFocused();
    expect(await f.page.evaluate(() => ({ body: document.body.style.overflow,
      html: document.documentElement.style.overflow, scrollY }))).toEqual(before);
    await trigger.click();
    await f.page.clock.runFor(100);
    expect(await dialog.evaluate(element => element.open && element.matches(':modal'))).toBe(true);
    await expect(dialog.getByLabel('제목', { exact: true })).toBeFocused();
    expectViewport(await geometry(dialog));
    expect(errors).toEqual([]);
  });
});
