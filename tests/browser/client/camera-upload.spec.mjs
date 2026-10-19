import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../support/client-fixture.mjs';

const fixturePath = name => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const audioUrl = 'https://example.com/reading-audio';

async function prepareCamera(page, mode = 'allow') {
  const png = (await readFile(fixturePath('qr-url.png'))).toString('base64');
  await page.clock.pauseAt(new Date('2026-10-17T15:01:00.000Z'));
  await page.evaluate(async ({ png, mode }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const state = window.__camera = { mode, calls: [], stopped: 0, intervals: [], cleared: [], frames: false, bitmapClosed: 0 };
    const source = document.createElement('canvas');
    source.width = source.height = image.width;
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (input, ...args) {
      return draw.call(this, input instanceof HTMLVideoElement ? (state.frames ? image : source) : input, ...args);
    };
    const set = window.setInterval;
    const clear = window.clearInterval;
    window.setInterval = (callback, delay, ...args) => {
      const id = set(callback, delay, ...args);
      if (delay === 500) state.intervals.push(id);
      return id;
    };
    window.clearInterval = id => { state.cleared.push(id); clear(id); };
    const bitmap = window.createImageBitmap;
    window.createImageBitmap = async (...args) => {
      const value = await bitmap(...args);
      const close = value.close.bind(value);
      value.close = () => { state.bitmapClosed++; close(); };
      return value;
    };
    Object.defineProperties(HTMLVideoElement.prototype, {
      videoWidth: { configurable: true, get: () => image.width },
      videoHeight: { configurable: true, get: () => image.height },
    });
    HTMLMediaElement.prototype.play = () => state.mode === 'holdPlay'
      ? new Promise(resolve => { state.finishPlay = resolve; }) : Promise.resolve();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mode === 'unsupported' ? undefined : {
      async getUserMedia(constraints) {
        state.calls.push(constraints);
        if (state.mode === 'denied' || state.mode === 'missing') {
          throw new DOMException('synthetic camera error', state.mode === 'denied' ? 'NotAllowedError' : 'NotFoundError');
        }
        const stream = source.captureStream(0);
        for (const track of stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => { state.stopped++; stop(); };
        }
        if (state.mode === 'holdStream') await new Promise(resolve => { state.grant = resolve; });
        return stream;
      },
    } });
  }, { png, mode });
  await page.locator('.profile-grid').getByRole('button', { name: /부모 관리/ }).click();
  await page.getByRole('button', { name: '자료 관리', exact: true }).click();
  await page.getByRole('heading', { name: '책과 단어 읽기 자료 입력' }).waitFor();
}

function field(page, name) { return page.getByRole('region', { name: '자료 입력 양식' }).getByLabel(name); }
async function scan(page, target = 'listen') {
  await page.getByRole('region', { name: '자료 입력 양식' }).getByRole('button', { name: 'QR 스캔', exact: true }).nth(target === 'listen' ? 0 : 1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function cameraState(page) {
  return page.evaluate(() => ({ calls: __camera.calls, stopped: __camera.stopped, intervals: __camera.intervals, cleared: __camera.cleared, closed: __camera.bitmapClosed }));
}

for (const target of ['listen', 'shadow']) {
  test(`M03-N01: QR file applies only to ${target} and closes bitmap/camera`, async ({ profileMaterial: f }) => {
    // Given
    const page = f.page;
    await prepareCamera(page);
    await field(page, target === 'listen' ? '정따 네이버 링크' : '읽기 네이버 링크').fill('https://example.com/unchanged');
    await scan(page, target);
    await expect.poll(async () => (await cameraState(page)).intervals.length).toBe(1);
    // When
    await page.getByRole('dialog').locator('input[type=file]').setInputFiles(fixturePath('qr-url.png'));
    // Then
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(field(page, target === 'listen' ? '읽기 네이버 링크' : '정따 네이버 링크')).toHaveValue(audioUrl);
    await expect(field(page, target === 'listen' ? '정따 네이버 링크' : '읽기 네이버 링크')).toHaveValue('https://example.com/unchanged');
    const state = await cameraState(page);
    expect(state.closed).toBe(1);
    expect(state.stopped).toBe(1);
    expect(state.cleared).toContain(state.intervals[0]);
    expect(f.writes('books')).toEqual([]);
  });
}

test('M03-N02: synthetic camera frame decodes into listen and can be copied to shadow', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page);
  await scan(page);
  await expect.poll(async () => (await cameraState(page)).intervals.length).toBe(1);
  // When
  await page.evaluate(() => { __camera.frames = true; });
  await page.clock.runFor(500);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '읽기 링크를 정따에 복사', exact: true }).click();
  // Then
  await expect(field(page, '읽기 네이버 링크')).toHaveValue(audioUrl);
  await expect(field(page, '정따 네이버 링크')).toHaveValue(audioUrl);
  const state = await cameraState(page);
  expect(state.calls).toEqual([{ video: { facingMode: 'environment' }, audio: false }]);
  expect(state.stopped).toBe(1);
  expect(state.cleared).toContain(state.intervals[0]);
});

test('M03-E01: blank frames leave the dialog open and close/reopen cleans each scan', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page);
  await scan(page);
  await expect.poll(async () => (await cameraState(page)).intervals.length).toBe(1);
  // When
  await page.clock.runFor(1000);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await scan(page, 'shadow');
  await expect.poll(async () => (await cameraState(page)).intervals.length).toBe(2);
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  // Then
  await expect(field(page, '읽기 네이버 링크')).toHaveValue('');
  await expect(field(page, '정따 네이버 링크')).toHaveValue('');
  const state = await cameraState(page);
  expect(state.stopped).toBe(2);
  expect(state.cleared).toEqual(expect.arrayContaining(state.intervals));
});

for (const mode of ['denied', 'missing', 'unsupported']) {
  test(`M03-F01: ${mode} camera offers upload and manual entry`, async ({ profileMaterial: f }) => {
    // Given
    const page = f.page;
    await prepareCamera(page, mode);
    // When
    await scan(page);
    // Then
    await expect(page.getByRole('dialog')).toContainText('카메라를 사용할 수 없습니다.');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'QR 사진 업로드' })).toBeEnabled();
    await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
    await field(page, '읽기 네이버 링크').fill(audioUrl);
    await expect(field(page, '읽기 네이버 링크')).toHaveValue(audioUrl);
    expect((await cameraState(page)).intervals).toEqual([]);
  });
}

test('M03-F02: corrupt QR file shows readable error and retains manual input', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page, 'denied');
  await field(page, '읽기 네이버 링크').fill('https://example.com/previous');
  await scan(page);
  // When
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  // Then
  await expect(page.locator('.toast')).toHaveText('QR 이미지를 읽지 못했습니다.');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(field(page, '읽기 네이버 링크')).toHaveValue('https://example.com/previous');
});

test('M03-E02: image without QR can be retried with the same file input', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page, 'denied');
  await scan(page);
  const blank = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 100;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const input = page.getByRole('dialog').locator('input[type=file]');
  // When
  await input.setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: Buffer.from(blank, 'base64') });
  // Then
  await expect(page.locator('.toast')).toHaveText('업로드한 이미지에서 QR 코드를 찾지 못했습니다.');
  await expect(input).toHaveValue('');
  expect((await cameraState(page)).closed).toBe(1);
  await input.setInputFiles(fixturePath('qr-url.png'));
  await expect(field(page, '읽기 네이버 링크')).toHaveValue(audioUrl);
  expect((await cameraState(page)).closed).toBe(2);
});

test('M03-E03: non-URL QR is decoded but form validation prevents saving', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page, 'denied');
  await field(page, '시리즈').fill('QR');
  await field(page, '책 제목').fill('URL 검증');
  await scan(page);
  // When
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(fixturePath('qr-text.png'));
  await expect(field(page, '읽기 네이버 링크')).toHaveValue('not a URL');
  await page.getByRole('button', { name: '책 추가', exact: true }).click();
  // Then
  expect(await field(page, '읽기 네이버 링크').evaluate(input => input.validity.typeMismatch)).toBe(true);
  expect(f.writes('books')).toEqual([]);
});

for (const action of ['close', 'unmount']) {
  test(`M03-E04: ${action} before camera grant stops late stream without a scan timer`, async ({ profileMaterial: f }) => {
    // Given
    const page = f.page;
    await prepareCamera(page, 'holdStream');
    await scan(page);
    await expect.poll(() => page.evaluate(() => Boolean(__camera.grant))).toBe(true);
    // When
    if (action === 'close') await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
    else await page.evaluate(() => __unmountReadingManager());
    await page.evaluate(() => __camera.grant());
    // Then
    await expect.poll(async () => (await cameraState(page)).stopped).toBe(1);
    expect((await cameraState(page)).intervals).toEqual([]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('M03-E05: unmount of a running scan stops track and interval', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page);
  await scan(page);
  await expect.poll(async () => (await cameraState(page)).intervals.length).toBe(1);
  // When
  await page.evaluate(() => __unmountReadingManager());
  // Then
  const state = await cameraState(page);
  expect(state.stopped).toBe(1);
  expect(state.cleared).toContain(state.intervals[0]);
});

test('M03-N03: cover file upload displays the compressed JPEG preview', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page, 'denied');
  // When
  await page.getByRole('region', { name: '자료 입력 양식' }).getByLabel('사진첩에서 선택').setInputFiles(fixturePath('qr-url.png'));
  // Then
  const preview = page.getByRole('img', { name: '표지 미리보기' });
  await expect(preview).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  expect(await preview.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(f.writes('books')).toEqual([]);
});

test('M03-E06: word-reading draft uses only the listen QR target', async ({ profileMaterial: f }) => {
  // Given
  const page = f.page;
  await prepareCamera(page, 'denied');
  await scan(page, 'shadow');
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(fixturePath('qr-url.png'));
  await expect(field(page, '정따 네이버 링크')).toHaveValue(audioUrl);
  await page.getByRole('button', { name: '새 단어 읽기', exact: true }).click();
  // When
  await scan(page);
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(fixturePath('qr-url.png'));
  // Then
  await expect(field(page, '단어 읽기 QR/URL')).toHaveValue(audioUrl);
  await expect(field(page, '정따 네이버 링크')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '읽기 링크를 정따에 복사', exact: true })).toHaveCount(0);
  await field(page, '단어 읽기 이름').fill('QR 단어');
  await page.getByRole('button', { name: '단어 읽기 추가', exact: true }).click();
  await expect.poll(() => f.writes('books').length).toBe(1);
  expect(f.writes('books')[0].body).toMatchObject({ content_type: 'wordReading', audio_listen: audioUrl, audio_shadow: '' });
});

for (const action of ['close', 'unmount']) {
  test(`M03-E07: ${action} during video play leaves no scan interval after play resolves`, async ({ profileMaterial: f }) => {
    // Given
    const page = f.page;
    await prepareCamera(page, 'holdPlay');
    await scan(page);
    await expect.poll(() => page.evaluate(() => Boolean(__camera.finishPlay))).toBe(true);
    // When
    if (action === 'close') await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
    else await page.evaluate(() => __unmountReadingManager());
    await page.evaluate(() => __camera.finishPlay());
    // Then
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const state = await cameraState(page);
    expect(state.stopped).toBe(1);
    expect(state.intervals.filter(id => !state.cleared.includes(id))).toEqual([]);
  });
}
