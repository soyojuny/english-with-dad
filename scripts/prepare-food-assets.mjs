import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Manual preparation only. App consumers use the canonical PNGs and catalog.json.
const root = "tmp_dragon/food/";
const sources = {
  basic: "4pjmna4pjmna4pjm", magic: "xax57mxax57mxax5",
  bitten: "at7yz6at7yz6at7y", bone: "7i70q27i70q27i70",
  magicBitten: "d97qrbd97qrbd97q", grape: "xfiqdexfiqdexfiq",
  alternate: "m877bfm877bfm877",
};
// Approved regions measured on 900px-wide review images. No image is resized.
const groups = {
  basic: [
    ["apple", "basic", [110, 0, 240, 250]],
    ["appleBite", "bitten", [35, 25, 240, 285]],
    ["meat", "basic", [500, 0, 330, 250]],
    ["meatBite", "bitten", [300, 45, 300, 260]],
    ["bone", "bone", [510, 35, 325, 200]],
    ["cookie", "basic", [110, 250, 240, 252]],
    ["cookieBite", "bitten", [630, 40, 240, 260]],
    ["basicBowl", "basic", [540, 250, 270, 252]],
    ["basicLessApple", "bitten", [30, 380, 275, 260]],
    ["basicLessMeat", "bitten", [605, 380, 275, 260]],
    ["basicLessCookie", "bitten", [320, 380, 275, 260]],
  ],
  magic: [
    ["fire", "magic", [110, 0, 240, 250]],
    ["fireBite", "alternate", [35, 15, 250, 290]],
    ["grapes", "magic", [540, 0, 250, 250]],
    ["grapeWhole", "alternate", [475, 232, 95, 80]],
    ["grapeHalf", "grape", [480, 245, 80, 65]],
    ["star", "magic", [110, 250, 240, 252]],
    ["starBite", "magicBitten", [585, 20, 220, 220]],
    ["magicBowl", "magic", [540, 250, 270, 252]],
    ["magicLessApple", "alternate", [30, 385, 275, 275]],
    ["magicLessGrapes", "magicBitten", [560, 240, 250, 262]],
    ["magicLessCookie", "grape", [315, 365, 285, 280]],
    ["grapesAfterOne", "grape", [320, 30, 285, 280]],
  ],
};
const foods = [
  { id: "lava-apple", name: "용암 열매", group: "basic", states: ["apple", "appleBite"], bowl: "basicBowl", bowlAfter: "basicLessApple" },
  { id: "bone-meat", name: "뼈고기", group: "basic", states: ["meat", "meatBite", "bone"], bowl: "basicBowl", bowlAfter: "basicLessMeat" },
  { id: "gold-star", name: "황금 별쿠키", group: "basic", states: ["cookie", "cookieBite"], bowl: "basicBowl", bowlAfter: "basicLessCookie" },
  { id: "fire-apple", name: "불꽃 사과", group: "magic", states: ["fire", "fireBite"], bowl: "magicBowl", bowlAfter: "magicLessApple" },
  { id: "thunder-grapes", name: "번개 포도", group: "magic", states: ["grapes", "grapeWhole", "grapeHalf"], bunchAfterOne: "grapesAfterOne", bowl: "magicBowl", bowlAfter: "magicLessGrapes" },
  { id: "aurora-star", name: "오로라 별쿠키", group: "magic", states: ["star", "starBite"], bowl: "magicBowl", bowlAfter: "magicLessCookie" },
];
const hash = data => createHash("sha256").update(data).digest("hex");
const cellWidth = 1152, cellHeight = 1024, columns = 4, rows = 3, padding = 32;
const loaded = {};
for (const [key, stem] of Object.entries(sources)) {
  const file = `${root}Gemini_Generated_Image_${stem}.png`;
  const bytes = await readFile(file);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  loaded[key] = { file, data, info, sha256: hash(bytes) };
}
const catalog = {
  version: 1, approval: "User approved the food assets and gradual biting animation on 2026-11-19.",
  frameWidth: cellWidth, frameHeight: cellHeight, columns, rows, padding,
  method: "Native source pixels are copied using integer translations only; no resizing, interpolation, sharpening, or generative editing. Exterior bright pixels are identified by flood fill through min RGB >150; enclosed highlights stay opaque. Exterior alpha uses the minimum white-matte alpha (255 - min RGB); white is unmixed while enclosed highlights are protected. Opaque RGB remains byte-identical. Detached grapes use connected silhouettes to exclude neighboring sprite fragments, with no hard sloping crop through the stem. PNG encode/decode preserves every RGBA byte.",
  foods, atlases: {}, frames: {},
  sources: Object.fromEntries(Object.entries(loaded).map(([k, s]) => [k, { path: s.file, sha256: s.sha256, size: [s.info.width, s.info.height] }])),
  knownLimits: [
    "White-background source images do not uniquely determine original glow/shadow alpha. Their appearance on dark backgrounds is estimated; pale glow can change.",
    "Original artwork angles, scale differences, and food arrangement changes remain. No missing detail is invented.",
    "The selected magic apple bowl has both apples removed. The grape bowl has the whole bunch removed; it is not the state after eating one grape.",
    "Reward ownership, app behavior, deployment WebP and PWA integration are separate from these prepared source assets.",
  ],
};
function neighbors(p, w, h) {
  const x = p % w, y = Math.floor(p / w);
  return [x ? p - 1 : -1, x + 1 < w ? p + 1 : -1, y ? p - w : -1, y + 1 < h ? p + w : -1];
}
for (const [group, entries] of Object.entries(groups)) {
  const atlasWidth = cellWidth * columns, atlasHeight = cellHeight * rows;
  const atlas = Buffer.alloc(atlasWidth * atlasHeight * 4);
  let changedOpaqueChannels = 0;
  for (const [frame, [id, sourceKey, reviewRect]] of entries.entries()) {
    const source = loaded[sourceKey], scale = source.info.width / 900;
    const [sx, sy, rw, rh] = reviewRect.map(v => Math.round(v * scale));
    const w = Math.min(rw, source.info.width - sx), h = Math.min(rh, source.info.height - sy), n = w * h;
    const original = Buffer.alloc(n * 4);
    for (let y = 0; y < h; y++) source.data.copy(original, y * w * 4, ((sy + y) * source.info.width + sx) * 4, ((sy + y) * source.info.width + sx + w) * 4);
    const pixels = Buffer.from(original), lo = new Uint8Array(n);
    for (let p = 0; p < n; p++) lo[p] = Math.min(original[p * 4], original[p * 4 + 1], original[p * 4 + 2]);
    const queue = new Int32Array(n), exterior = new Uint8Array(n);
    const visit = p => { if (p >= 0 && !exterior[p] && lo[p] > 150) { exterior[p] = 1; queue[tail++] = p; } };
    let tail = 0, head = 0;
    for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
    while (head < tail) for (const next of neighbors(queue[head++], w, h)) visit(next);
    // Preserve the entire largest dark/colored grape silhouette, including its stem.
    // Only neighboring components and their detached exterior fringe are excluded.
    let allowed = null, silhouetteBounds = null, silhouettePixels = 0;
    if (id === "grapeWhole" || id === "grapeHalf") {
      const labels = new Int32Array(n), parts = []; let label = 0;
      const coreLimit = 150;
      for (let p = 0; p < n; p++) if (!labels[p] && lo[p] <= coreLimit) {
        label++; head = 0; tail = 1; queue[0] = p; labels[p] = label;
        while (head < tail) for (const next of neighbors(queue[head++], w, h)) if (next >= 0 && !labels[next] && lo[next] <= coreLimit) { labels[next] = label; queue[tail++] = next; }
        parts.push({ label, count: tail });
      }
      parts.sort((a, b) => b.count - a.count);
      const main = parts[0]; assert.ok(main && main.count > 1000, `${id}: whole silhouette required`);
      const outside = new Uint8Array(n); head = 0; tail = 0;
      const exteriorVisit = p => { if (p >= 0 && !outside[p] && labels[p] !== main.label) { outside[p] = 1; queue[tail++] = p; } };
      for (let x = 0; x < w; x++) { exteriorVisit(x); exteriorVisit((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { exteriorVisit(y * w); exteriorVisit(y * w + w - 1); }
      while (head < tail) for (const next of neighbors(queue[head++], w, h)) exteriorVisit(next);
      allowed = new Uint8Array(n); const distance = new Int16Array(n).fill(-1);
      head = 0; tail = 0; let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let p = 0; p < n; p++) if (!outside[p]) {
        const x = p % w, y = Math.floor(p / w); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        allowed[p] = 1; distance[p] = 0; queue[tail++] = p;
      }
      silhouetteBounds = [x0, y0, x1, y1]; silhouettePixels = main.count;
      assert.ok(x0 > 2 && y0 > 2 && x1 < w - 3 && y1 < h - 3, `${id}: stem and outline must not touch crop edges (${[x0,y0,x1,y1]} in ${w}x${h}; parts ${parts.slice(0,4).map(v=>v.count)})`);
      while (head < tail) { const p = queue[head++]; if (distance[p] === 12) continue;
        for (const next of neighbors(p, w, h)) if (next >= 0 && distance[next] < 0 && (!labels[next] || labels[next] === main.label)) { distance[next] = distance[p] + 1; allowed[next] = 1; queue[tail++] = next; }
      }
    }
    let x0 = w, y0 = h, x1 = 0, y1 = 0, opaque = 0, matte = 0, maxWhiteError = 0;
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (allowed && !allowed[p]) pixels[i + 3] = 0;
      else if (exterior[p] && lo[p] >= 250) pixels[i + 3] = 0;
      else if (exterior[p] && lo[p] > 150) {
        const alpha = 255 - lo[p];
        pixels[i + 3] = alpha;
        for (let c = 0; c < 3; c++) pixels[i + c] = Math.round((original[i + c] - 255 + alpha) * 255 / alpha);
        matte++;
      }
      if (!allowed || allowed[p]) for (let c = 0; c < 3; c++) {
        const composite = Math.round(pixels[i + c] * pixels[i + 3] / 255 + 255 - pixels[i + 3]);
        maxWhiteError = Math.max(maxWhiteError, Math.abs(composite - original[i + c]));
      }
      if (pixels[i + 3] === 255) { opaque++; for (let c = 0; c < 3; c++) if (pixels[i + c] !== original[i + c]) changedOpaqueChannels++; }
      if (pixels[i + 3]) { const x = p % w, y = Math.floor(p / w); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    assert.ok(maxWhiteError <= 5, `${id}: white composite drift ${maxWhiteError}`);
    const visibleWidth = x1 - x0 + 1, visibleHeight = y1 - y0 + 1;
    assert.ok(visibleWidth + padding * 2 <= cellWidth && visibleHeight + padding * 2 <= cellHeight, `${id}: whole sprite plus padding must fit`);
    const dx = Math.floor((cellWidth - visibleWidth) / 2), dy = cellHeight - padding - visibleHeight;
    const col = frame % columns, row = Math.floor(frame / columns);
    for (let y = y0; y <= y1; y++) {
      const to = (((row * cellHeight + dy + y - y0) * atlasWidth) + col * cellWidth + dx) * 4;
      pixels.copy(atlas, to, (y * w + x0) * 4, (y * w + x1 + 1) * 4);
    }
    catalog.frames[id] = { group, frame, rect: [col * cellWidth, row * cellHeight, cellWidth, cellHeight], contentRect: [dx, dy, visibleWidth, visibleHeight], source: sourceKey, sourceRect: [sx, sy, w, h], sourceContentOffset: [x0, y0], integerTranslation: [dx - x0 - sx, dy - y0 - sy], opaquePixelsPreserved: opaque, mattePixels: matte, maxWhiteCompositeError: maxWhiteError, wholeSilhouetteBounds: silhouetteBounds, wholeSilhouettePixelsPreserved: silhouettePixels };
  }
  assert.equal(changedOpaqueChannels, 0, "Opaque food RGB must match original bytes");
  const png = await sharp(atlas, { raw: { width: atlasWidth, height: atlasHeight, channels: 4 } }).png().toBuffer();
  const decoded = await sharp(png).ensureAlpha().raw().toBuffer();
  assert.deepEqual(decoded, atlas, "PNG must preserve every RGBA byte");
  const file = `assets/dragons/source/food/${group}.png`;
  await writeFile(file, png);
  catalog.atlases[group] = { path: file, size: [atlasWidth, atlasHeight], frames: entries.length, sha256: hash(png), rgbaSha256: hash(decoded), changedOpaqueChannels };
  console.log(JSON.stringify({ file, frames: entries.length, size: [atlasWidth, atlasHeight], bytes: png.length, changedOpaqueChannels }));
}
await writeFile("assets/dragons/source/food/catalog.json", JSON.stringify(catalog, null, 2) + "\n");
