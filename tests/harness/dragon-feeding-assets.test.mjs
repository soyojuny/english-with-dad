import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

test('번개 먹기 9개 자세의 날개 아래 배경 조각이 투명하다', async () => {
  // Given
  const gaps = [[385, 440], [365, 440], [360, 435], [375, 425], [365, 425], [345, 425], [405, 420], [390, 410], [385, 420]];
  // When
  const { data, info } = await sharp('assets/dragons/source/baby/thunder-eat.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Then
  for (const [frame, [x, y]] of gaps.entries()) {
    const offset = ((Math.floor(frame / 3) * 800 + y) * info.width + frame % 3 * 960 + x) * 4;
    assert.equal(data[offset + 3], 0, `자세 ${frame + 1}의 날개 틈`);
  }
});

test('불 먹기 혀 날름 자세의 이마 밖 흰 조각이 투명하다', async () => {
  // Given
  const x = 960 + 714, y = 1600 + 234;
  // When
  const { data, info } = await sharp('assets/dragons/source/baby/fire-eat.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Then
  assert.equal(data[(y * info.width + x) * 4 + 3], 0);
});

for (const name of ['baby/fire-eat', 'baby/thunder-eat', 'food/basic', 'food/magic']) {
  test(`${name} 배포는 추가 축소 없이 원본 크기·알파·보이는 RGB를 보존한다`, async () => {
    // Given
    const png = await sharp(`assets/dragons/source/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // When
    const webp = await sharp(`public/assets/dragons/${name}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Then
    const size = name.startsWith('food/') ? [4608, 3072] : [2880, 2400];
    assert.deepEqual([png.info.width, png.info.height], size);
    assert.deepEqual([webp.info.width, webp.info.height], size);
    let alphaDifferences = 0, visibleRgbDifferences = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] !== webp.data[i + 3]) alphaDifferences++;
      if (png.data[i + 3] && (png.data[i] !== webp.data[i] || png.data[i + 1] !== webp.data[i + 1] || png.data[i + 2] !== webp.data[i + 2])) visibleRgbDifferences++;
    }
    assert.equal(alphaDifferences, 0);assert.equal(visibleRgbDifferences, 0);
  });
}
