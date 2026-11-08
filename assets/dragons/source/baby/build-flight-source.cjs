// Run from the repository root. Normal builds read the resulting PNGs directly.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

function removeBackground(rgb, width, height) {
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  let read = 0;
  let write = 0;
  const add = (pixel) => {
    if (seen[pixel]) return;
    const i = pixel * 3;
    if (Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) > 24) return;
    seen[pixel] = 1;
    queue[write++] = pixel;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (read < write) {
    const pixel = queue[read++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) add(pixel - 1);
    if (x < width - 1) add(pixel + 1);
    if (y > 0) add(pixel - width);
    if (y < height - 1) add(pixel + width);
  }
  const rgba = Buffer.alloc(count * 4);
  for (let pixel = 0; pixel < count; pixel++) {
    rgba[pixel * 4] = rgb[pixel * 3];
    rgba[pixel * 4 + 1] = rgb[pixel * 3 + 1];
    rgba[pixel * 4 + 2] = rgb[pixel * 3 + 2];
    rgba[pixel * 4 + 3] = seen[pixel] ? 0 : 255;
  }
  return rgba;
}

async function main() {
  const output = 'assets/dragons/source/baby';
  const sets = [['takeoff', 13, 42, true], ['move', 36, 47, false], ['hover', 58, 66, false]];
  const report = {
    cell: 640, columns: 6, fps: 12,
    background: 'Edge-connected black pixels (max RGB <=24), alpha-only; source RGB retained.',
    takeoffReplacements: { 25: 'old 14 at (-9,+17)', 26: 'old 15 at (-9,+17)' },
    frames: [],
  };
  for (const [motion, start, end, isNew] of sets) {
    const composite = [];
    for (let n = start; n <= end; n++) {
      const number = String(n).padStart(3, '0');
      const file = isNew ? `tmp_dragon/무속성 드래곤 날기_2/new날기${number}.png`
        : `tmp_dragon/무속성 드래곤 날기/neutral_fly_${number}.png`;
      const input = await fs.readFile(file);
      const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const rgba = removeBackground(data, info.width, info.height);
      let image = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
      // Remove only blank left padding to account for the two capture origins.
      if (!isNew) image = image.extract({ left: 9, top: 0, width: 489, height: 425 });
      const index = n - start;
      composite.push({ input: await image.png().toBuffer(), left: index % 6 * 640,
        top: Math.floor(index / 6) * 640 + (isNew ? 0 : 22) });
      report.frames.push({ motion, source: file, sha256: createHash('sha256').update(input).digest('hex'),
        index, translate: isNew ? [0, 0] : [-9, 22] });
    }
    const file = path.join(output, `flight-${motion}.png`);
    await sharp({ create: { width: 3840, height: Math.ceil((end - start + 1) / 6) * 640,
      channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composite).png().toFile(file);
    console.log(file, (await fs.stat(file)).size);
  }
  await fs.writeFile(path.join(output, 'flight.json'), JSON.stringify(report, null, 2) + '\n');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
