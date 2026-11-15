import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const pngPath = 'assets/dragons/source/baby/thunder-breath.png';
const webpPath = 'public/assets/dragons/baby/thunder-breath.webp';

test('번개 B 시트는 원본 820×570의 12자세와 몸체·얼굴 픽셀을 보존한다', async () => {
  // Given: independently recorded native source patches from the approved B image.
  const record = JSON.parse(await readFile('assets/dragons/source/baby/thunder-breath.json', 'utf8'));
  // When
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Then: a smaller regenerated sheet or altered character pixels cannot pass.
  assert.deepEqual([info.width, info.height], [3280, 1710]);
  assert.equal(record.qualityChecks.length, 12);
  assert.equal(record.decodedPngQuality.changedOpaqueChannels, 0);
  assert.ok(record.decodedPngQuality.maxVisibleWhiteRoundtripError <= 1);
  for (const check of record.qualityChecks) for (const patch of check.opaqueSourcePatches) {
    const [x, y, width, height] = patch.rect;
    const actual = Buffer.alloc(width * height * 4);
    for (let py = 0; py < height; py++) {
      const offset = ((Math.floor((check.frame - 1) / 4) * 570 + y + py) * info.width + (check.frame - 1) % 4 * 820 + x) * 4;
      data.copy(actual, py * width * 4, offset, offset + width * 4);
    }
    assert.equal(createHash('sha256').update(actual).digest('hex'), patch.rgbaSha256, `frame ${check.frame} source patch ${patch.rect}`);
  }
});

test('배포 WebP는 정식 PNG의 크기·알파·보이는 RGB를 손실 없이 보존한다', async () => {
  // Given
  const png = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // When
  const webp = await sharp(webpPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Then: RGB values of fully transparent pixels are intentionally irrelevant to rendering.
  assert.deepEqual([webp.info.width, webp.info.height], [3280, 1710]);
  assert.equal(png.data.length, webp.data.length);
  let alphaDifferences = 0, visibleRgbDifferences = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] !== webp.data[i + 3]) alphaDifferences++;
    if (png.data[i + 3] && (png.data[i] !== webp.data[i] || png.data[i + 1] !== webp.data[i + 1] || png.data[i + 2] !== webp.data[i + 2])) visibleRgbDifferences++;
  }
  assert.equal(alphaDifferences, 0);
  assert.equal(visibleRgbDifferences, 0);
});
