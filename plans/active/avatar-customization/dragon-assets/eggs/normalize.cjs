const sharp = require('sharp');
const path = require('node:path');

(async () => {
  for (const name of ['spotted', 'striped', 'diamond']) {
    const input = path.join(__dirname, 'extracted', `${name}.png`);
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] <= 128) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < left) throw new Error(`Empty alpha: ${name}`);
    // Keep a small transparent edge around the visible contour while resizing.
    const x = Math.max(0, left - 2), y = Math.max(0, top - 2);
    const height = bottom - top + 1;
    const egg = await sharp(input).extract({ left: x, top: y,
      width: Math.min(info.width, right + 3) - x,
      height: Math.min(info.height, bottom + 3) - y })
      .resize({ height: Math.round((height + 4) * 896 / height) }).png().toBuffer();
    const size = await sharp(egg).metadata();
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#00000000' } })
      .composite([{ input: egg, left: Math.round((1024 - size.width) / 2), top: 62 }])
      .png().toFile(path.join(__dirname, `${name}.png`));
    console.log(`${name}: 1024×1024, visible height ≈896px, baseline ≈960px`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
