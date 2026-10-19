import { test, expect } from '../support/next-fixture.mjs';

async function openApp(context, page, nextApp) {
  await context.addCookies([nextApp.auth.sessionCookie(nextApp.origin)]);
  await page.goto(nextApp.origin);
  await expect(page.getByRole('heading', { name: '책 읽기 관리', exact: true })).toBeVisible();
}

async function controlled(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
}

test('P01-B01: 실제 Next manifest는 설치 메타와 응답 가능한 icon 자산을 제공한다', async ({ page, nextApp }) => {
  // Given
  await page.goto(nextApp.origin);
  // When
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(href, nextApp.origin);
  expect(manifestUrl.origin, 'manifest 요청은 로컬 Next origin만 허용').toBe(nextApp.origin);
  const response = await page.request.get(manifestUrl.href, { maxRedirects: 0 });
  const manifest = await response.json();
  const assets = [];
  for (const icon of manifest.icons) {
    const iconUrl = new URL(icon.src, response.url());
    expect(iconUrl.origin, 'icon 요청은 로컬 Next origin만 허용').toBe(nextApp.origin);
    const asset = await page.request.get(iconUrl.href, { maxRedirects: 0 });
    assets.push({ type: icon.type, status: asset.status(),
      contentType: asset.headers()['content-type'], length: (await asset.body()).length });
  }
  // Then
  expect(response.status()).toBe(200);
  expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone', lang: 'ko' });
  expect(manifest.icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512', 'any']);
  for (const asset of assets) {
    expect(asset.status).toBe(200);
    expect(asset.contentType).toContain(asset.type);
    expect(asset.length).toBeGreaterThan(0);
  }
});

test('P01-B02: 앱 등록 worker가 shell 자산을 준비하고 온라인 navigation은 서버 문서를 반환한다', async ({ context, page, nextApp }) => {
  // Given
  await openApp(context, page, nextApp);
  await controlled(page);
  // When
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const cache = await caches.open('ewd-reading-v1');
    return { script: registration.active.scriptURL, scope: registration.scope,
      paths: (await cache.keys()).map(request => new URL(request.url).pathname).sort() };
  });
  const response = await page.goto(`${nextApp.origin}/auth/error`);
  // Then
  expect(state.script).toBe(`${nextApp.origin}/sw.js`);
  expect(state.scope).toBe(`${nextApp.origin}/`);
  expect(state.paths).toEqual(['/', '/assets/app-icon-192.png', '/assets/app-icon-512.png',
    '/assets/app-icon.svg', '/assets/covers/berenstain-doctor.jpg', '/assets/covers/bones.jpg',
    '/assets/covers/monthly-filled.jpg', '/manifest.webmanifest']);
  expect(response.fromServiceWorker()).toBe(true);
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '인증 링크를 다시 확인해 주세요' })).toBeVisible();
});

test('P01-B03: offline navigation은 cached root 문서를 반환하고 캐시 icon도 읽을 수 있다', async ({ context, page, nextApp }) => {
  // Given
  await openApp(context, page, nextApp);
  await controlled(page);
  const cachedRoot = await page.evaluate(async () => (await caches.match('/')).text());
  await context.setOffline(true);
  // When: document response is the contract; offline writes/full hydration are outside this step.
  const response = await page.goto(`${nextApp.origin}/auth/error`, { waitUntil: 'domcontentloaded' });
  const html = await response.text();
  const icon = await page.evaluate(async () => {
    const response = await fetch('/assets/app-icon.svg');
    return { status: response.status, text: await response.text() };
  });
  // Then
  expect(response.fromServiceWorker()).toBe(true);
  expect(response.status()).toBe(200);
  expect(html).toBe(cachedRoot);
  expect(html).toContain('책 읽기 관리');
  expect(html).not.toContain('인증 링크를 다시 확인해 주세요');
  expect(icon.status).toBe(200);
  expect(icon.text).toContain('<svg');
});

test('P01-B04: SW 등록 거절은 안내를 표시하며 온라인 앱 shell은 사용할 수 있다', async ({ context, page, nextApp }) => {
  // Given: registration boundary failure only, actual Next page and component run unchanged.
  await page.addInitScript(() => {
    navigator.serviceWorker.register = async () => { throw new Error('fixture registration rejected'); };
  });
  // When
  await openApp(context, page, nextApp);
  // Then
  await expect(page.getByText('PWA 캐시 등록을 건너뛰었습니다.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '사용할 프로필을 고르세요' })).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistration())).toBeUndefined();
});
