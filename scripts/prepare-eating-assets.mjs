import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Manual asset preparation. Production consumers only need the canonical PNG and JSON.
const width = 960, height = 800, anchor = [535, 730];
const hash = (data) => createHash("sha256").update(data).digest("hex");
const configs = [
  { name: "fire", original: "tmp_dragon/Gemini_Generated_Image_v52kbyv52kbyv52k.png", footX: [485, 1135, 1805], footY: [700, 1360, 2015] },
  { name: "thunder", original: "tmp_dragon/Gemini_Generated_Image_qlzovaqlzovaqlzo.png", footX: [460, 1110, 1780], footY: [675, 1337, 2010] },
];
function region(name, col, row) {
  const fire = name === "fire";
  const sy = fire ? [0, 720, 1375][row] : row * 683;
  const h = fire ? [720, 655, 673][row] : Math.min(690, 2048 - sy);
  const edges = fire ? (row === 0 ? [
    [[725, 0], [725, 450], [615, 500], [615, 590], [715, 640], [715, 720]],
    [[1395, 0], [1395, 490], [1310, 530], [1310, 600], [1395, 640], [1395, 720]],
  ] : row === 1 ? [ [[690, 0], [690, h]], [[1370, 0], [1370, h]] ]
    : [ [[685, 0], [685, h]], [[1345, 0], [1345, 250], [1325, 270], [1325, h]] ]) : [
    [[710, 0], [710, 410], [645, 440], [645, 560], [710, 620], [710, 690]],
    [[1390, 0], [1390, 405], [1310, 440], [1310, 565], [1390, 625], [1390, 690]],
  ];
  return { sy, h, left: col ? edges[col - 1] : [[0, 0], [0, h]], right: col === 2 ? [[2048, 0], [2048, h]] : edges[col] };
}
function boundary(points, y) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    if (y <= y1) return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
  }
  return points.at(-1)[0];
}
for (const config of configs) {
  const original = await readFile(config.original);
  const { data: source, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 2048); assert.equal(info.height, 2048);
  // Identify the nine whole silhouettes before cutting: a tail can cross a cell boundary.
  const labels = new Int32Array(info.width * info.height), queue = new Int32Array(labels.length);
  const background = (p) => {
    const i = p * 4, lo = Math.min(source[i], source[i + 1], source[i + 2]);
    return lo >= 250 && Math.max(source[i], source[i + 1], source[i + 2]) - lo <= 5;
  };
  const components = []; let label = 0;
  for (let p = 0; p < labels.length; p++) if (!labels[p] && !background(p)) {
    label++; let head = 0, tail = 1, x0 = 2048, y0 = 2048, x1 = 0, y1 = 0;
    labels[p] = label; queue[0] = p;
    while (head < tail) {
      const q = queue[head++], x = q % 2048, y = Math.floor(q / 2048);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy, next = ny * 2048 + nx;
        if (nx < 0 || nx >= 2048 || ny < 0 || ny >= 2048 || labels[next] || background(next)) continue;
        labels[next] = label; queue[tail++] = next;
      }
    }
    components.push({ label, count: tail, bounds: [x0, y0, x1, y1], frame: Math.floor((y0 + y1) / 2 / 683) * 3 + Math.floor((x0 + x1) / 2 / 683) });
  }
  const bodies = components.sort((a, b) => b.count - a.count).slice(0, 9);
  assert.equal(new Set(bodies.map((body) => body.frame)).size, 9, "One whole silhouette per pose required");
  const bodyLabels = new Set(bodies.map((body) => body.label));
  const atlas = Buffer.alloc(width * 3 * height * 3 * 4);
  const records = [], references = [];
  for (let frame = 0; frame < 9; frame++) {
    const col = frame % 3, row = Math.floor(frame / 3);
    const crop = region(config.name, col, row);
    const body = bodies.find((part) => part.frame === frame);
    const dx = anchor[0] - config.footX[col], dy = anchor[1] - config.footY[row];
    const native = Buffer.alloc(width * height * 4, 255);
    for (let y = 0; y < crop.h; y++) for (let x = Math.ceil(boundary(crop.left, y)); x < boundary(crop.right, y); x++) {
      const tx = x + dx, ty = crop.sy + y + dy;
      const from = ((crop.sy + y) * info.width + x) * 4;
      const sourceLabel = labels[from / 4];
      if (bodyLabels.has(sourceLabel) && sourceLabel !== body.label) continue;
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) {
        assert.ok(Math.min(...source.subarray(from, from + 3)) >= 250, `Frame ${frame + 1}: visible source clipped`);
        continue;
      }
      source.copy(native, (ty * width + tx) * 4, from, from + 4);
    }
    // Restore any pixels of this silhouette outside the manual gap boundary.
    const [x0, y0, x1, y1] = body.bounds;
    let copiedBodyPixels = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (labels[y * 2048 + x] === body.label) {
      const tx = x + dx, ty = y + dy;
      assert.ok(tx >= 0 && tx < width && ty >= 0 && ty < height, "Whole silhouette must fit the output cell");
      const from = (y * 2048 + x) * 4;
      source.copy(native, (ty * width + tx) * 4, from, from + 4);
      copiedBodyPixels++;
    }
    assert.equal(copiedBodyPixels, body.count);
    references.push(native);
    const pixels = Buffer.from(native), count = width * height;
    const white = new Uint8Array(count), edge = new Uint8Array(count);
    // Expand the original white-background mask into adjacent pale residue.
    const flood = (seeds, minimum) => {
      const pending = [...seeds];
      for (let head = 0; head < pending.length; head++) {
        const p = pending[head];
        if (white[p]) continue;
        const i = p * 4, lo = Math.min(...native.subarray(i, i + 3)), hi = Math.max(...native.subarray(i, i + 3));
        if (lo < minimum || hi - lo > 55) continue;
        white[p] = 1;
        const x = p % width, y = Math.floor(p / width);
        if (x) pending.push(p - 1);
        if (x + 1 < width) pending.push(p + 1);
        if (y) pending.push(p - width);
        if (y + 1 < height) pending.push(p + width);
      }
    };
    const border = [];
    for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
    for (let y = 0; y < height; y++) border.push(y * width, y * width + width - 1);
    for (let p = 0; p < count; p++) {
      const i = p * 4, lo = Math.min(...native.subarray(i, i + 3)), hi = Math.max(...native.subarray(i, i + 3));
      if (lo >= 250 && hi - lo <= 5) border.push(p);
    }
    // Reviewed closed gaps below the thunder wing: these are background, not scales.
    const wingGapSeeds = [[385, 440], [365, 440], [360, 435], [375, 425], [365, 425], [345, 425], [405, 420], [390, 410], [385, 420]];
    const gapSeeds = config.name === "thunder" ? [wingGapSeeds[frame]] : frame === 7 ? [[714, 234]] : [];
    for (const [x, y] of gapSeeds) {
      assert.ok(Math.min(...native.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)) > 100, "Background seed must be pale");
      flood([y * width + x], 100);
    }
    flood(border, 200);
    for (let p = 0; p < count; p++) if (white[p]) {
      const x = p % width, y = Math.floor(p / width);
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
        const nx = x + ox, ny = y + oy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) edge[ny * width + nx] = 1;
      }
    }
    let opaque = 0, matte = 0, maxWhiteError = 0;
    for (let p = 0; p < count; p++) {
      const i = p * 4, lo = Math.min(...native.subarray(i, i + 3));
      if (white[p]) pixels[i + 3] = 0;
      else if (edge[p] && lo > 80) {
        // Estimate the foreground from a nearby dark outline instead of assuming
        // a zero-valued channel, which amplified tiny color differences into speckles.
        const x = p % width, y = Math.floor(p / width);
        let nearest = -1, distance = Infinity;
        for (let oy = -5; oy <= 5; oy++) for (let ox = -5; ox <= 5; ox++) {
          const nx = x + ox, ny = y + oy, q = ny * width + nx;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || white[q] || ox * ox + oy * oy >= distance) continue;
          if (Math.min(...native.subarray(q * 4, q * 4 + 3)) > 80) continue;
          nearest = q * 4; distance = ox * ox + oy * oy;
        }
        if (nearest < 0) pixels[i + 3] = 0;
        else {
          let numerator = 0, denominator = 0;
          for (let c = 0; c < 3; c++) {
            const dark = 255 - native[nearest + c];
            numerator += (255 - native[i + c]) * dark;
            denominator += dark * dark;
          }
          const alpha = Math.min(1, numerator / denominator);
          pixels[i + 3] = alpha < 0.08 ? 0 : Math.round(alpha * 255);
          if (pixels[i + 3] && pixels[i + 3] < 255) for (let c = 0; c < 3; c++) {
            const recovered = (native[i + c] - 255 * (1 - alpha)) / alpha;
            pixels[i + c] = Math.round(Math.max(0, Math.min(255, Math.abs(recovered - native[nearest + c]) > 35 ? native[nearest + c] : recovered)));
          }
        }
        matte++;
      } else opaque++;
      for (let c = 0; c < 3; c++) {
        const whiteComposite = Math.round(pixels[i + c] * pixels[i + 3] / 255 + 255 - pixels[i + 3]);
        maxWhiteError = Math.max(maxWhiteError, Math.abs(whiteComposite - native[i + c]));
        if (pixels[i + 3] === 255) assert.equal(pixels[i + c], native[i + c]);
      }
      const x = p % width, y = Math.floor(p / width);
      const j = ((row * height + y) * width * 3 + col * width + x) * 4;
      pixels.copy(atlas, j, i, i + 4);
    }
    records.push({ originalFrame: frame + 1, sourceRegion: crop, wholeSilhouetteBounds: body.bounds, wholeSilhouettePixelsCopied: copiedBodyPixels, integerTranslation: [dx, dy], opaquePixelsPreserved: opaque, mattePixels: matte, maxWhiteCompositeError: maxWhiteError, nativeFrameSha256: hash(native), rgbaSha256: hash(pixels) });
  }
  const output = `assets/dragons/source/baby/${config.name}-eat.png`;
  const png = await sharp(atlas, { raw: { width: width * 3, height: height * 3, channels: 4 } }).png().toBuffer();
  const decoded = await sharp(png).ensureAlpha().raw().toBuffer();
  assert.deepEqual(decoded, atlas, "PNG encode/decode must preserve every RGBA byte");
  let changedOpaqueChannels = 0;
  for (let frame = 0; frame < 9; frame++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = ((Math.floor(frame / 3) * height + y) * width * 3 + frame % 3 * width + x) * 4;
    const j = (y * width + x) * 4;
    if (decoded[i + 3] === 255) for (let c = 0; c < 3; c++) if (decoded[i + c] !== references[frame][j + c]) changedOpaqueChannels++;
  }
  assert.equal(changedOpaqueChannels, 0);
  const record = {
    original: config.original, originalSha256: hash(original), originalSize: [info.width, info.height],
    approval: "User approved the cleaned nine-pose eating atlas on 2026-11-19.", output, outputSha256: hash(png),
    frameWidth: width, frameHeight: height, columns: 3, rows: 3, footAnchor: anchor,
    selectedOriginalFrames: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    playbackOriginalFrames: [1, 2, 3, 4, 5, 4, 5, 4, 5, 6, 7, 8, 9, 1],
    playbackDurationsMs: [500, config.name === "fire" ? 300 : 220, config.name === "fire" ? 180 : 260, 220, 180, 220, 180, 220, 180, 260, 300, 900, 600, 500],
    method: "Nine whole connected silhouettes are identified before cutting, including tails crossing manual gap boundaries; neighboring silhouettes are excluded. Native source pixels are placed with integer translations only. No resize, resampling, sharpening, or generative editing. The original near-white mask (min RGB >=250, spread <=5) expands into connected pale residue (min RGB >=200, spread <=55). Reviewed seeds remove the nine thunder under-wing gaps and the fire frame 8 forehead residue down to min RGB 100. Within 3px of the mask, bright matte pixels use a dark outline reference within 5px to estimate white-matte alpha and suppress color speckles; unsupported or alpha <0.08 residue is removed. All remaining opaque RGB bytes are unchanged. PNG decoding is byte-identical to the packed RGBA atlas.",
    quality: { changedOpaqueChannels, decodedRgbaSha256: hash(decoded), frames: records },
    knownDefects: ["Original pose-to-pose shape differences and source-edge tail clipping remain; no missing source detail is invented.", "Alpha is estimated from a white-composited original. Removed background patches intentionally change the white-composite pixels; minor edge differences may remain. Body highlights, including the thunder frame 9 foot marking, are preserved.", "The fire frame 5 mouth has irregular tooth/crumb detail already present in the approved source."],
  };
  await writeFile(output, png);
  await writeFile(output.replace(/\.png$/, ".json"), JSON.stringify(record, null, 2) + "\n");
  console.log(JSON.stringify({ output, dimensions: [width * 3, height * 3], bytes: png.length, changedOpaqueChannels }));
}
