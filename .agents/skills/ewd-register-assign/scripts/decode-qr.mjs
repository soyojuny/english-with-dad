import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import jsQR from "jsqr";

export function getQrHttpUrl(raw) {
  const value = raw.trim().replace(/^URL:\s*/i, "");
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

export async function decodeQrImage({ path, regions = [] }) {
  const source = readFileSync(path);
  const { width, height } = await sharp(source).metadata();
  const targets = regions.length ? regions : [{ label: "whole" }];
  const output = [];

  for (const region of targets) {
    const cropped = regions.length > 0;
    if (cropped) {
      const { left, top, width: cropWidth, height: cropHeight } = region;
      if (![left, top, cropWidth, cropHeight].every(Number.isInteger) ||
          left < 0 || top < 0 || cropWidth < 1 || cropHeight < 1 ||
          left + cropWidth > width || top + cropHeight > height) {
        throw new Error(`${path}: QR 영역은 원본 크기 안의 정수 좌표여야 합니다.`);
      }
    }
    const target = cropped
      ? await sharp(source).extract({ left: region.left, top: region.top, width: region.width, height: region.height }).png().toBuffer()
      : source;
    const resizeWidths = cropped ? [300, 500, 700] : [0.25, 0.5, 1].map((scale) => Math.max(1, Math.round(width * scale)));
    const thresholds = cropped ? [null, 120, 150, 180] : [null];
    const results = new Map();

    for (const resizeWidth of resizeWidths) {
      for (const threshold of thresholds) {
        let pipeline = sharp(target).resize({ width: resizeWidth });
        if (threshold !== null) pipeline = pipeline.threshold(threshold);
        const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const pixels = new Uint8ClampedArray(data);
        let qr;
        while ((qr = jsQR(pixels, info.width, info.height, { inversionAttempts: "attemptBoth" }))) {
          if (!results.has(qr.data)) results.set(qr.data, { raw: qr.data, url: getQrHttpUrl(qr.data), attempts: [] });
          results.get(qr.data).attempts.push({ resizeWidth, threshold });
          // Hide this code so another QR in the same image can be decoded.
          const points = [qr.location.topLeftCorner, qr.location.topRightCorner, qr.location.bottomLeftCorner, qr.location.bottomRightCorner];
          const left = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))) - 8);
          const right = Math.min(info.width, Math.ceil(Math.max(...points.map((point) => point.x))) + 8);
          const top = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))) - 8);
          const bottom = Math.min(info.height, Math.ceil(Math.max(...points.map((point) => point.y))) + 8);
          for (let y = top; y < bottom; y += 1) {
            for (let x = left; x < right; x += 1) {
              const offset = (y * info.width + x) * 4;
              pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
            }
          }
        }
      }
    }
    output.push({ region: region.label, results: [...results.values()] });
  }
  return { path, width, height, regions: output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error("사용법: node decode-qr.mjs <입력 JSON 경로>");
    const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
    const images = [];
    for (const image of input.images) images.push(await decodeQrImage(image));
    console.log(JSON.stringify({ images }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
