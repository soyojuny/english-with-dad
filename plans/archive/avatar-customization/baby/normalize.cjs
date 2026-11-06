const sharp = require('sharp');
const path = require('node:path');

(async () => {
  for (const name of ['neutral', 'blink', 'breathe', 'fire', 'lightning', 'ice']) {
    const input = path.join(__dirname, 'transparent', `${name}.png`);
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= 128) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error(`Empty image: ${name}`);
    const x = Math.max(0, left - 4), y = Math.max(0, top - 4);
    const width = Math.min(info.width, right + 5) - x;
    const height = Math.min(info.height, bottom + 5) - y;
    const scale = 880 / (bottom - top + 1);
    const dragon = await sharp(input).extract({ left: x, top: y, width, height })
      .resize({ width: Math.round(width * scale), height: Math.round(height * scale) }).png().toBuffer();
    const size = await sharp(dragon).metadata();
    await sharp({ create: { width: 1400, height: 1024, channels: 4, background: '#00000000' } })
      .composite([{ input: dragon, left: Math.round((1400 - size.width) / 2), top: Math.round(960 - (bottom - y) * scale) }])
      .png().toFile(path.join(__dirname, 'aligned', `${name}.png`));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
