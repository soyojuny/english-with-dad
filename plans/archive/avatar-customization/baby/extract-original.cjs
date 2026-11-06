const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs');

const sources = {
  neutral: 'omauf2omauf2omau', blink: 'jpotzljpotzljpot', breathe: 'xust2nxust2nxust',
  fire: 'bk88ecbk88ecbk88', lightning: 'k2bc0kk2bc0kk2bc', ice: '55vooo55vooo55vo',
};

(async () => {
  const output = path.join(__dirname, 'original-cutouts');
  fs.mkdirSync(output, { recursive: true });
  for (const [name, id] of Object.entries(sources)) {
    const input = path.join(__dirname, `Gemini_Generated_Image_${id}.png`);
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const seen = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0, tail = 0;
    function add(index) {
      if (seen[index]) return;
      seen[index] = 1;
      const p = index * 4;
      const min = Math.min(data[p], data[p + 1], data[p + 2]);
      const max = Math.max(data[p], data[p + 1], data[p + 2]);
      if (min >= 190 && max - min <= 8) queue[tail++] = index;
    }
    for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
    // The gap between the far wing and neck is enclosed by the outline.
    add(819 * width + 1229);
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      data[i * 4 + 3] = 0;
      if (x) add(i - 1); if (x + 1 < width) add(i + 1);
      if (y) add(i - width); if (y + 1 < height) add(i + width);
    }
    // The source's isolated white corner mark is far outside the dragon.
    for (let y = 1850; y < height; y++) for (let x = 1850; x < width; x++) data[(y * width + x) * 4 + 3] = 0;
    await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(path.join(output, `${name}.png`));
    console.log(`${name}: ${width}x${height}, removed ${tail} background pixels`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
