import { test, expect } from '../support/media-fixture.mjs';

for (const filename of ['qr-url.png', 'qr-inverted.png', 'qr-text.png']) {
  test(`M02: real canvas/jsQR decodes ${filename}`, async ({ media: page }) => {
    // Given
    const expected = filename === 'qr-text.png' ? 'not a URL' : 'https://example.com/reading-audio';
    // When
    const value = await page.evaluate(async filename => {
      const image = new Image();
      image.src = `/${filename}`;
      await image.decode();
      return media.readQrValueFromSource(image, image.naturalWidth, image.naturalHeight);
    }, filename);
    // Then
    expect(value).toBe(expected);
  });
}

test('M02: blank and zero-sized real sources return null', async ({ media: page }) => {
  // Given
  // When
  const values = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 100;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 100, 100);
    return [media.readQrValueFromSource(canvas, 100, 100), media.readQrValueFromSource(canvas, 0, 100)];
  });
  // Then
  expect(values).toEqual([null, null]);
});

test('M01: transparent real image is compressed into a bounded white JPEG', async ({ media: page }) => {
  // Given
  // When
  const result = await page.evaluate(async () => {
    const source = document.createElement('canvas');
    source.width = 1920;
    source.height = 960;
    const blob = await new Promise(resolve => source.toBlob(resolve));
    const data = await media.compressCoverImage(new File([blob], 'transparent.png', { type: 'image/png' }));
    const image = new Image();
    image.src = data;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return { jpeg: data.startsWith('data:image/jpeg;base64,'), size: [image.width, image.height], pixel: [...context.getImageData(0, 0, 1, 1).data] };
  });
  // Then
  expect(result).toEqual({ jpeg: true, size: [960, 480], pixel: [255, 255, 255, 255] });
});

test('M01: corrupt real image rejects and releases its object URL', async ({ media: page }) => {
  // Given
  // When
  const result = await page.evaluate(async () => {
    const original = URL.revokeObjectURL;
    const released = [];
    URL.revokeObjectURL = url => { released.push(url); original.call(URL, url); };
    try {
      await media.compressCoverImage(new File(['not an image'], 'broken.png', { type: 'image/png' }));
      return { message: null, count: released.length };
    } catch (error) {
      return { message: error.message, count: released.length };
    } finally { URL.revokeObjectURL = original; }
  });
  // Then
  expect(result).toEqual({ message: '표지 이미지를 읽지 못했습니다.', count: 1 });
});
