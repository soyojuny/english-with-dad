const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');

(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer(async (request, response) => {
    const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
    try {
      const content = await fs.readFile(file);
      response.setHeader('Content-Type', file.endsWith('.png') ? 'image/png' : file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8');
      response.end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const url = `http://127.0.0.1:${server.address().port}/fire-dragon/habitat-preview.html`;
    for (const [width, height] of [[1280, 800], [800, 1280], [390, 844], [320, 740]]) {
      // Given: tablet landscape/portrait and compact screens with the real local images.
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => !document.querySelector('#fire').disabled);
      // When: change backgrounds, decorations and placement, then play each action.
      assert(await page.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth > 0)));
      for (const background of ['lava-stone-platform', 'lava-central-volcano', 'lava-waterfall', 'lava-open-foreground']) {
        await page.selectOption('#background-choice', background);
        await page.locator('#background').evaluate(image => image.decode());
      }
      await page.uncheck('#show-relic');
      assert(await page.locator('#relic').isHidden());
      await page.check('#show-relic');
      await page.uncheck('#show-crystal');
      assert(await page.locator('#crystal').isHidden());
      await page.check('#show-crystal');
      await page.click('#placement');
      assert.equal(await page.locator('#crystal').evaluate(image => image.style.left), '72%');
      await page.click('#placement');
      await page.click('#pause');
      for (const action of ['roar', 'fire']) {
        await page.click('#' + action);
        assert(await page.locator('#pause').isDisabled());
        assert(await page.locator('#roar').isDisabled());
        assert(await page.locator('#fire').isDisabled());
        if (action === 'fire') {
          await page.waitForFunction(() => document.querySelector('#flame').classList.contains('active'));
          await page.waitForTimeout(350);
          if (width === 1280) await page.screenshot({ path: path.join(__dirname, 'habitat-fire.png'), fullPage: true });
        }
        await page.waitForFunction(() => !document.querySelector('#fire').disabled);
        // Then: return to the adult with idle still paused and no flame or overflow.
        assert.equal(await page.locator('#dragon').getAttribute('src'), 'transparent/adult.png');
        assert.equal(await page.locator('#flame').getAttribute('class'), 'flame');
        assert.match(await page.locator('#status').textContent(), /멈췄/);
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      if (width >= 800) await page.screenshot({ path: path.join(__dirname, `habitat-${width}x${height}.png`), fullPage: true });
      await page.close();
      console.log(`PASS ${width}x${height}: images, backgrounds, props, actions, pause, layout`);
    }
    // Given: reduced motion, then a missing source image.
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.goto(url);
    await page.waitForFunction(() => !document.querySelector('#fire').disabled);
    // When/Then: automatic idle is paused; explicit actions remain available.
    assert.equal(await page.locator('#pause').textContent(), '대기 재생하기');
    assert.equal(await page.locator('#breath').evaluate(element => element.getAnimations().length), 0);
    await page.route('**/transparent/adult.png', route => route.abort());
    await page.reload();
    // When/Then: missing assets show an error and keep controls disabled.
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('불러오지 못'));
    assert(await page.locator('#fire').isDisabled());
    assert(await page.locator('#background-choice').isDisabled());
    await page.close();
    console.log('PASS reduced motion and missing image');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
