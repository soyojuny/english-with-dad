import { test, expect } from '../support/client-fixture.mjs';

const title = '아빠와 함께 매일 읽으며 새로운 세상을 만나는 아주 긴 한국어 그림책 제목';
const series = '우리 가족이 함께 고른 즐거운 영어 그림책 시리즈';
const child = { id: 'child-1', name: '민준', level: '2', goal: '매일 즐겁게 읽기' };
const books = Array.from({ length: 24 }, (_, index) => ({ id: `mobile-book-${index}`,
  title: `${title} ${index + 1}권`, series, audio_listen: 'https://example.com/read',
  audio_shadow: 'https://example.com/shadow', cover: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' }));

async function parent(page, panel) {
  await page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();
  if (panel) await page.getByRole('button', { name: panel, exact: true }).click();
}

async function documentFits(page) {
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth,
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) }));
  expect(size.document, `문서 전체 가로 넘침: ${JSON.stringify(size)}`).toBeLessThanOrEqual(size.viewport + 1);
}

async function readable(locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const geometry = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height,
      viewport: document.documentElement.clientWidth };
  });
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.height).toBeGreaterThan(0);
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.right, `${locator}: ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(geometry.viewport + 1);
}

// Only rendered prose/labels: input values may legitimately scroll inside their controls.
async function textClear(locator) {
  await readable(locator);
  const problems = await locator.evaluate(root => {
    const issues = [];
    const scope = root.closest('dialog, form, .assignment-card, .return-box') || root.parentElement;
    const controls = [...scope.querySelectorAll('button, input, select, textarea')]
      .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          const box = parent.getBoundingClientRect();
          if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)
            && (rect.left < box.left - 1 || rect.right > box.right + 1)) issues.push('text clipped horizontally');
          if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)
            && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)) issues.push('text clipped vertically');
          if (parent === scope) break;
        }
        for (const control of controls) {
          if (control.contains(node)) continue;
          const box = control.getBoundingClientRect();
          if (Math.min(rect.right, box.right) - Math.max(rect.left, box.left) > 1
            && Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top) > 1) issues.push('text overlaps control');
        }
      }
    }
    return issues;
  });
  expect(problems, '보이는 문구는 잘리거나 주변 컨트롤과 겹치지 않아야 한다').toEqual([]);
}

async function target(locator) {
  await readable(locator);
  await expect(locator).toBeEnabled();
  const hit = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const points = [[rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + 3, rect.top + rect.height / 2], [rect.right - 3, rect.top + rect.height / 2]];
    return { width: rect.width, height: rect.height, reachable: points.every(([x, y]) => {
      const found = document.elementFromPoint(x, y);
      return found === element || element.contains(found);
    }) };
  });
  expect(hit.width).toBeGreaterThanOrEqual(24);
  expect(hit.height).toBeGreaterThanOrEqual(24);
  expect(hit.reachable, '버튼/입력의 중앙과 양 끝이 다른 요소에 가려지지 않아야 한다').toBe(true);
}

for (const width of [360, 390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('P02-N01: 긴 한국어 자료 등록 폼의 label과 저장 action을 읽고 조작한다', async ({ profileMaterial: f }, testInfo) => {
      // Given
      const page = f.page;
      f.seed({ children: [child] });
      await parent(page, '자료 관리');
      const form = page.getByRole('region', { name: '자료 입력 양식' });
      // When
      await form.getByLabel('시리즈', { exact: true }).fill(series);
      await form.getByLabel('책 제목', { exact: true }).fill(title);
      await form.getByLabel('읽기 네이버 링크').fill('https://example.com/read');
      await form.getByRole('button', { name: '책 추가', exact: true }).click();
      await expect(form.getByRole('button', { name: '책 저장', exact: true })).toBeVisible();
      const geometry = await form.evaluate(root => {
        const heading = root.querySelector('h2');
        const chain = [];
        for (let element = heading; element && element !== document.body; element = element.parentElement) {
          const css = getComputedStyle(element);
          chain.push({ tag: element.tagName, class: element.className,
            width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth,
            minWidth: css.minWidth, grid: css.gridTemplateColumns, display: css.display, gap: css.gap });
        }
        return { viewport: innerWidth, document: document.documentElement.scrollWidth, chain,
          controls: [...root.querySelectorAll('input, select, textarea')].map(element => ({
            tag: element.tagName, type: element.type, width: element.getBoundingClientRect().width,
            scrollWidth: element.scrollWidth, minWidth: getComputedStyle(element).minWidth })) };
      });
      await testInfo.attach('registration-layout-geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
      // Then
      expect(f.writes('books')).toHaveLength(1);
      expect(f.writes('books')[0].body.title).toBe(title);
      await textClear(form.getByRole('heading', { name: title, exact: true }));
      for (const name of ['시리즈', '책 제목', '읽기 네이버 링크', '정따 네이버 링크']) {
        await target(form.getByLabel(name));
        await textClear(form.locator('label').filter({ hasText: name }).first());
      }
      await target(form.getByRole('button', { name: '책 저장', exact: true }));
      await documentFits(page);
    });

    test('P02-E01: 많은 긴 자료 검색과 최대 3회 배정 폼은 문서 안에서 조작된다', async ({ assignment: f }) => {
      // Given
      const page = f.page;
      f.seed({ children: [child], books });
      await parent(page, '할 일 배정');
      // When
      await page.getByRole('searchbox', { name: '책/자료 제목, 시리즈, 권수, 레벨 검색' }).fill('새로운 세상');
      await expect(page.locator('.assignment-candidate')).toHaveCount(20);
      await page.locator('.assignment-candidate').first().getByRole('button', { name: '추가', exact: true }).click();
      const config = page.locator('.assignment-book-config');
      await config.getByRole('combobox', { name: '활동 구분' }).selectOption('focusListen');
      for (const name of ['읽기', '정따', '스스로 읽기']) {
        await config.getByRole('combobox', { name, exact: true }).selectOption('3');
      }
      await textClear(config.locator('.assignment-book-title'));
      for (const name of ['활동 구분', '읽기', '정따', '스스로 읽기', '퀴즈']) {
        await target(config.getByRole('combobox', { name, exact: true }));
      }
      await target(page.getByRole('button', { name: '날짜별 할 일 생성', exact: true }));
      await page.getByRole('button', { name: '날짜별 할 일 생성', exact: true }).click();
      await expect(page.locator('.assignment-manage-item')).toHaveCount(1);
      // Then
      expect(f.writes('assignments')[0].body[0].task_counts).toEqual({ listen: 3, shadow: 3, self: 3 });
      await textClear(page.locator('.assignment-manage-item').getByText(/아빠와 함께/).first());
      await expect(page.locator('.assignment-manage-item')).toContainText(books[23].title);
      await documentFits(page);
    });

    test('P02-N02: 아동 카드와 완료 버튼은 키보드로 실행되고 다음 횟수를 표시한다', async ({ audio: f }) => {
      // Given
      const page = f.page;
      const complete = page.getByRole('button', { name: '1회 완료', exact: true });
      // When
      await page.getByRole('button', { name: '오디오 열기', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(complete).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: '2회 완료', exact: true })).toBeVisible();
      // Then
      await readable(page.locator('.assignment-card').filter({ hasText: '테스트 책 2' }));
      await readable(page.locator('.status-row'));
      await target(page.getByRole('button', { name: '2회 완료', exact: true }));
      expect(f.completions[0].count).toBe(1);
      await documentFits(page);
    });

    test('P02-F01: 완료 저장 오류와 재시도 action은 좁은 화면에서도 가려지지 않는다', async ({ audio: f }) => {
      // Given
      const page = f.page;
      f.fail();
      // When
      await page.getByRole('button', { name: '1회 완료', exact: true }).click();
      const retry = page.getByRole('button', { name: '같은 요청 재시도', exact: true });
      await expect(retry).toBeVisible();
      await textClear(page.locator('.return-box').getByRole('status'));
      await expect(page.locator('.return-box')).toContainText('저장 결과를 확인하지 못했습니다.');
      await target(retry);
      f.recover();
      await retry.click();
      await expect(page.getByRole('button', { name: '2회 완료', exact: true })).toBeVisible();
      // Then
      expect(f.completions[0].count).toBe(1);
      expect(f.writes).toBe(2);
      await expect(retry).toHaveCount(0);
      await target(page.getByRole('button', { name: '2회 완료', exact: true }));
      await documentFits(page);
    });

    test('P02-F02: QR 권한 거부 안내와 업로드/닫기는 키보드와 hit target을 유지한다', async ({ profileMaterial: f }) => {
      // Given
      const page = f.page;
      await page.evaluate(() => Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true, value: { getUserMedia: async () => { throw new DOMException('fixture denied', 'NotAllowedError'); } },
      }));
      await parent(page, '자료 관리');
      const form = page.getByRole('region', { name: '자료 입력 양식' });
      await form.getByLabel('읽기 네이버 링크').focus();
      // When
      await page.keyboard.press('Tab');
      const scan = form.getByRole('button', { name: 'QR 스캔', exact: true }).first();
      await expect(scan).toBeFocused();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('카메라를 사용할 수 없습니다.');
      await textClear(dialog.getByRole('heading', { name: '네이버 오디오 링크 입력' }));
      await textClear(dialog.getByText('카메라를 사용할 수 없습니다.', { exact: false }));
      await target(dialog.getByRole('button', { name: 'QR 사진 업로드', exact: true }));
      const close = dialog.getByRole('button', { name: '닫기', exact: true });
      await target(close);
      await close.focus();
      await page.keyboard.press('Enter');
      // Then
      await expect(dialog).toHaveCount(0);
      await target(form.getByLabel('읽기 네이버 링크'));
      await documentFits(page);
    });

    test('P02-E03: 긴 한국어 아동 카드와 최대 횟수 안내는 잘리지 않는다', async ({ profileMaterial: f }) => {
      // Given
      const page = f.page;
      f.seed({ children: [child], books: [books[0]], assignments: [{ id: 'long-child-card',
        child_id: child.id, date: '2026-10-18', book_id: books[0].id, activity_category: 'focusListen',
        tasks: ['listen', 'shadow', 'self'], task_counts: { listen: 3, shadow: 3, self: 3 }, quiz_enabled: false }] });
      await page.reload(); // Re-read the seeded children before selecting a profile.
      // When
      await page.locator('.profile-grid').getByRole('button', { name: /민준/ }).click();
      const card = page.locator('.assignment-card');
      await card.click();
      // Then
      await target(card);
      await textClear(card.getByRole('heading', { name: books[0].title, exact: true }));
      await textClear(page.getByRole('region', { name: '선택한 학습 활동' }).getByRole('heading', { name: books[0].title, exact: true }));
      await expect(page.locator('.status-row')).toContainText('읽기 0/3회');
      await expect(page.locator('.status-row')).toContainText('정따 0/3회');
      await expect(page.locator('.status-row')).toContainText('스스로 읽기 0/3회');
      await textClear(page.locator('.status-row'));
      await documentFits(page);
    });

    test('P02-E02: 활동표의 의도된 내부 가로 스크롤은 문서 전체를 늘리지 않는다', async ({ parentReport: f }) => {
      // Given
      const page = f.page;
      f.seed({ children: [child], books: [books[0]], assignments: [{ id: 'report-1', child_id: child.id,
        date: '2026-10-18', book_id: books[0].id, activity_category: 'focusListen', tasks: ['listen'], task_counts: { listen: 3 } }],
        completions: [{ assignment_id: 'report-1', task_type: 'listen', count: 3,
          completed_at: '2026-10-18T01:00:00.000Z', minutes: 30 }] });
      await parent(page);
      await expect(page.locator('.activity-table')).toContainText(books[0].title);
      const wrap = page.locator('.table-wrap').filter({ has: page.locator('.activity-table') });
      // When
      const scroll = await wrap.evaluate(element => {
        const before = element.scrollLeft;
        element.scrollLeft = element.scrollWidth;
        return { before, after: element.scrollLeft, client: element.clientWidth, content: element.scrollWidth,
          overflow: getComputedStyle(element).overflowX };
      });
      // Then
      expect(scroll.overflow).toBe('auto');
      if (width < 980) {
        expect(scroll.content).toBeGreaterThan(scroll.client);
        expect(scroll.after).toBeGreaterThan(scroll.before);
      }
      await target(page.getByRole('button', { name: '다음 기간', exact: true }));
      await documentFits(page);
    });
  });
}
