import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

export const coverContract = Object.freeze({
  maxDimension: 960,
  format: "jpeg",
  quality: 72,
  background: "#ffffff",
  maxInputBytes: 30 * 1024 * 1024,
  maxInputPixels: 60_000_000,
});

export function fingerprint(data) {
  return { bytes: Buffer.byteLength(data), sha256: createHash("sha256").update(data).digest("hex") };
}

async function readCover(path) {
  const file = await stat(path);
  if (!file.isFile() || file.size === 0 || file.size > coverContract.maxInputBytes) {
    throw new Error(`${path}: 표지 파일은 1바이트 이상 30MiB 이하여야 합니다.`);
  }
  const buffer = await readFile(path);
  // Decode the bytes, not the extension or caller-provided MIME.
  const metadata = await sharp(buffer, { limitInputPixels: coverContract.maxInputPixels }).metadata();
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) {
    throw new Error(`${path}: 단일 이미지 표지만 허용합니다.`);
  }
  return {
    buffer,
    metadata: {
      path,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      orientation: metadata.orientation ?? 1,
      ...fingerprint(buffer),
    },
  };
}

export async function processCover(path) {
  const source = await readCover(path);
  const { data, info } = await sharp(source.buffer, { limitInputPixels: coverContract.maxInputPixels })
    .rotate()
    .resize({ width: coverContract.maxDimension, height: coverContract.maxDimension, fit: "inside", withoutEnlargement: true })
    .flatten({ background: coverContract.background })
    .jpeg({ quality: coverContract.quality })
    .toBuffer({ resolveWithObject: true });
  const dataUrl = `data:image/jpeg;base64,${data.toString("base64")}`;
  return {
    buffer: data,
    dataUrl,
    source: source.metadata,
    processed: {
      mime: "image/jpeg",
      width: info.width,
      height: info.height,
      ...fingerprint(data),
      storedCover: { characters: dataUrl.length, ...fingerprint(dataUrl) },
    },
  };
}
