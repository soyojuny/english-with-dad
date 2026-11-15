import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Manual source preparation only. The app build reads the canonical PNG, not tmp_dragon.
const recordPath = "assets/dragons/source/baby/thunder-breath.json";
const record = JSON.parse(await readFile(recordPath, "utf8"));
const width = 820, height = 570;
const source = await sharp(record.original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const frames = [];
const nativeFrames = [];
const checks = [];
const hash = (data) => createHash("sha256").update(data).digest("hex");

for (const [frame, [sx, sy, cropWidth, cropHeight, ax, ay]] of record.previewSourceRectangles.entries()) {
  // Integer translation only: copy the exact native source bytes into the approved canvas.
  const pixels = Buffer.alloc(width * height * 4, 255);
  const left = 505 - (ax - sx), top = 530 - (ay - sy);
  for (let y = 0; y < cropHeight; y++) for (let x = 0; x < cropWidth; x++) {
    const dx = left + x, dy = top + y;
    if (dx < 0 || dx >= width || dy < 0 || dy >= height) continue;
    const from = ((sy + y) * source.info.width + sx + x) * 4;
    source.data.copy(pixels, (dy * width + dx) * 4, from, from + 4);
  }
  const original = Buffer.from(pixels);
  nativeFrames.push(original);
  const count = width * height;
  const white = new Uint8Array(count);
  const background = new Uint8Array(count);
  const queue = new Int32Array(count);
  const whiteCore = new Uint8Array(count);
  const inEffect = (x, y) => frame >= 1 && frame <= 7 && ((x > 300 && y < 225) || x > 480);
  for (let p = 0; p < count; p++) {
    const i = p * 4, lo = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
    white[p] = lo >= 245 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - lo <= 8 ? 1 : 0;
  }
  // White lightning cores need to remain opaque even where a cropped beam meets the background.
  const colored = (x, y) => {
    const i = (y * width + x) * 4;
    return Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 12;
  };
  for (let y = 5; y < height - 5; y++) for (let x = 5; x < width - 5; x++) {
    const p = y * width + x;
    if (!white[p] || !inEffect(x, y)) continue;
    let above = false, below = false, before = false, after = false;
    for (let d = 1; d <= 4; d++) {
      above ||= colored(x, y - d); below ||= colored(x, y + d);
      before ||= colored(x - d, y); after ||= colored(x + d, y);
    }
    if ((above && below) || (before && after)) whiteCore[p] = 1;
  }
  // Keep the one-pixel antialias around detected white cores, without protecting the outer glow.
  const coreSeeds = Uint8Array.from(whiteCore);
  for (let p = 0; p < count; p++) if (coreSeeds[p]) {
    const x = p % width, y = Math.floor(p / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const q = ny * width + nx, i = q * 4;
      const lo = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
      if (lo >= 225 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - lo <= 30) whiteCore[q] = 1;
    }
  }
  // Remove white connected to the canvas exterior, plus known white gaps within the body.
  let head = 0, tail = 0;
  const seed = (p) => { if (white[p] && !whiteCore[p] && !background[p]) { background[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const gap = (x >= 355 && x <= 410 && y >= 228 && y <= 310)
      || (x >= 300 && x <= 370 && y >= 430 && y <= 490)
      || (x >= 235 && x <= 280 && y >= 300 && y <= 330)
      || (frame === 2 && x >= 310 && x <= 335 && y >= 215 && y <= 240);
    if (gap) seed(y * width + x);
  }
  while (head < tail) {
    const p = queue[head++], x = p % width, y = Math.floor(p / width);
    if (x) seed(p - 1); if (x < width - 1) seed(p + 1);
    if (y) seed(p - width); if (y < height - 1) seed(p + width);
  }
  // Preserve the native character between its dark left/right outlines on each row.
  // The breath starts to the right of the character (x >= 580); white gaps were seeded above.
  const exterior = new Uint8Array(count);
  for (let y = 0; y < height; y++) {
    let first = width, last = -1;
    for (let x = 0; x < 580; x++) {
      const i = (y * width + x) * 4;
      if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 150
          && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) < 250) {
        first = Math.min(first, x); last = x;
      }
    }
    for (let x = 0; x < width; x++) exterior[y * width + x] = x < first || x > last ? 1 : 0;
  }
  const edge = new Uint8Array(count);
  for (let p = 0; p < count; p++) if (background[p]) {
    const x = p % width, y = Math.floor(p / width);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) edge[ny * width + nx] = 1;
    }
  }
  let opaque = 0, matte = 0, removed = 0, maxRoundtripError = 0;
  for (let p = 0; p < count; p++) {
    const i = p * 4, x = p % width, y = Math.floor(p / width);
    if (background[p] || ((frame === 0 || frame >= 8) && y < 190 && white[p] && !whiteCore[p])) { pixels[i + 3] = 0; removed++; continue; }
    const lo = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (!white[p] && !whiteCore[p] && lo > 0 && (exterior[p] || (edge[p] && lo > 80))) {
      const alpha = edge[p] && lo > 80 ? 255 - lo : Math.min(255, Math.round((255 - lo) * 255 / 100));
      if (alpha > 0) {
        // C = a*F + (1-a)*white. Invert only matte-contaminated edge/glow pixels.
        for (let channel = 0; channel < 3; channel++) pixels[i + channel] = Math.max(0, Math.min(255, Math.round((pixels[i + channel] - 255 + alpha) * 255 / alpha)));
        pixels[i + 3] = alpha;
        matte++;
      }
    }
    if (pixels[i + 3] === 255) {
      opaque++;
      if (!pixels.subarray(i, i + 3).equals(original.subarray(i, i + 3))) throw new Error(`Frame ${frame + 1}: opaque RGB changed`);
    }
    for (let channel = 0; channel < 3; channel++) {
      const composited = Math.round(pixels[i + channel] * pixels[i + 3] / 255 + 255 - pixels[i + 3]);
      maxRoundtripError = Math.max(maxRoundtripError, Math.abs(composited - original[i + channel]));
    }
  }
  if (maxRoundtripError > 1) throw new Error(`Frame ${frame + 1}: white-matte roundtrip error ${maxRoundtripError}`);
  const opaqueSourcePatches = [];
  for (const [x, y, patchWidth, patchHeight] of [[420, 350, 20, 20], ...(frame === 0 ? [[450, 200, 40, 40]] : [])]) {
    const reference = Buffer.alloc(patchWidth * patchHeight * 4);
    for (let py = 0; py < patchHeight; py++) for (let px = 0; px < patchWidth; px++) {
      const i = ((y + py) * width + x + px) * 4;
      original.copy(reference, (py * patchWidth + px) * 4, i, i + 4);
      if (!pixels.subarray(i, i + 4).equals(original.subarray(i, i + 4))) throw new Error(`Frame ${frame + 1}: original body patch changed`);
    }
    opaqueSourcePatches.push({ rect: [x, y, patchWidth, patchHeight], rgbaSha256: hash(reference) });
  }
  checks.push({ frame: frame + 1, opaquePixelsPreserved: opaque, separatedMattePixels: matte, backgroundPixelsRemoved: removed, maxVisibleWhiteRoundtripError: maxRoundtripError, nativePreviewSha256: hash(original), opaqueSourcePatches });
  frames.push({ input: await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer(), left: frame % 4 * width, top: Math.floor(frame / 4) * height });
}
const png = await sharp({ create: { width: width * 4, height: height * 3, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } }).composite(frames).png().toBuffer();
const decoded = await sharp(png).ensureAlpha().raw().toBuffer();
let decodedRoundtripError = 0, changedOpaqueChannels = 0;
for (let frame = 0; frame < 12; frame++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 4;
  const j = ((Math.floor(frame / 4) * height + y) * width * 4 + frame % 4 * width + x) * 4;
  if (!decoded[j + 3]) continue;
  for (let channel = 0; channel < 3; channel++) {
    const roundtrip = Math.round(decoded[j + channel] * decoded[j + 3] / 255 + 255 - decoded[j + 3]);
    decodedRoundtripError = Math.max(decodedRoundtripError, Math.abs(roundtrip - nativeFrames[frame][i + channel]));
    if (decoded[j + 3] === 255 && decoded[j + channel] !== nativeFrames[frame][i + channel]) changedOpaqueChannels++;
  }
}
if (decodedRoundtripError > 1 || changedOpaqueChannels) throw new Error("Canonical PNG altered visible source pixels");
await writeFile(record.output, png);
// Source images and previews are provenance only; production builds consume the canonical PNG.
for (const key of ["editPrompt", "generatedSize"]) delete record[key];
record.frameWidth = width; record.frameHeight = height;
record.outputSha256 = hash(png);
record.originalSha256 = hash(await readFile(record.original));
record.method = "Native source RGB copied with integer translations into 820x570 cells, no resizing, filtering or generative editing. Exterior white and measured wing/leg/tail gaps removed by connected flood fill. Opaque body pixels unchanged. Only matte-contaminated edge/glow pixels are mathematically unmixed from white; compositing visible pixels onto white reconstructs the native preview within one 8-bit level. White lightning cores protected. App build encodes this 3280x1710 canonical PNG as lossless WebP without resizing.";
record.qualityChecks = checks;
record.decodedPngQuality = { maxVisibleWhiteRoundtripError: decodedRoundtripError, changedOpaqueChannels };
record.knownDefects = ["Original beam ends in frames 6 and 7 are clipped in the approved source.", "White-matte separation cannot uniquely recover original translucent glow; the deterministic result preserves visible appearance on white, with opaque white lightning cores retained. Near-white exterior pixels are removed at min RGB >=245 and channel spread <=8."];
await writeFile(recordPath, JSON.stringify(record, null, 2) + "\n");
console.log(JSON.stringify({ sourceSize: [source.info.width, source.info.height], atlasSize: [width * 4, height * 3], frames: checks }, null, 2));
