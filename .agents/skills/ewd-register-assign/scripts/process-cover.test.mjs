import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, truncate, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { coverContract, fingerprint, processCover } from "./process-cover.mjs";

async function fixture(t, width, height, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "ewd-cover-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "original.png");
  const image = sharp({ create: { width, height, channels: 4, background: { r: 230, g: 120, b: 40, alpha: 1 }, ...options } });
  await image.png().toFile(path);
  return path;
}

test("세로 표지는 960px JPEG로 축소되고 원본과 메타데이터 계약을 보존한다", async (t) => {
  // Given
  const path = await fixture(t, 1600, 2400);
  const original = await readFile(path);
  // When
  const result = await processCover(path);
  // Then
  assert.equal(result.processed.width, 640);
  assert.equal(result.processed.height, 960);
  assert.equal(result.processed.mime, "image/jpeg");
  assert(result.processed.bytes < original.length);
  assert.deepEqual(result.source.sha256, fingerprint(original).sha256);
  assert.deepEqual(await readFile(path), original);
  assert.deepEqual(Buffer.from(result.dataUrl.split(",")[1], "base64"), result.buffer);
  assert.equal(result.processed.storedCover.bytes, Buffer.byteLength(result.dataUrl));
  assert.equal(result.processed.storedCover.sha256, fingerprint(result.dataUrl).sha256);
});

for (const [width, height] of [[2400, 1600], [80, 120], [960, 960]]) {
  test(`${width}×${height}: 비율과 최대 크기를 지키고 작은 이미지를 확대하지 않는다`, async (t) => {
    // Given
    const path = await fixture(t, width, height);
    // When
    const { processed } = await processCover(path);
    // Then
    assert(processed.width <= Math.min(width, 960));
    assert(processed.height <= Math.min(height, 960));
    assert.equal(processed.width / processed.height, width / height);
  });
}

test("EXIF 방향을 반영하고 위치·방향 메타데이터를 출력에 남기지 않는다", async (t) => {
  // Given
  const path = await fixture(t, 80, 120);
  const bytes = await sharp(await readFile(path)).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  await writeFile(path, bytes);
  // When
  const result = await processCover(path);
  const metadata = await sharp(result.buffer).metadata();
  // Then
  assert.equal(result.source.orientation, 6);
  assert.equal(result.processed.width, 120);
  assert.equal(result.processed.height, 80);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.exif, undefined);
});

test("투명 입력은 흰색 배경으로 합성된다", async (t) => {
  // Given
  const path = await fixture(t, 12, 12, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  // When
  const result = await processCover(path);
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  // Then
  assert.equal(info.channels, 3);
  assert(data.every((value) => value >= 254));
});

test("입력 표지의 여백을 자르지 않고 전체 영역을 압축한다", async (t) => {
  // Given
  const path = await fixture(t, 120, 180);
  const source = await sharp({ create: { width: 120, height: 180, channels: 3, background: "#111111" } })
    .composite([{ input: { create: { width: 80, height: 140, channels: 3, background: "#ffffff" } }, left: 20, top: 20 }])
    .png().toBuffer();
  await writeFile(path, source);
  // When
  const result = await processCover(path);
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  // Then
  assert.equal(info.width, 120);
  assert.equal(info.height, 180);
  assert(data[0] < 30);
  assert(data[(90 * info.width + 60) * info.channels] > 245);
  assert.deepEqual(await readFile(path), source);
});

for (const [name, bytes] of [["빈 파일", Buffer.alloc(0)], ["이미지가 아닌 파일", Buffer.from("not an image")],
  ["손상 PNG", Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")]]) {
  test(`${name}을 저장 후보로 만들지 않는다`, async (t) => {
    // Given
    const path = await fixture(t, 10, 10);
    await writeFile(path, bytes);
    // When
    const action = () => processCover(path);
    // Then
    await assert.rejects(action);
  });
}

test("30MiB를 초과하는 파일은 이미지 디코딩 전에 거부한다", async (t) => {
  // Given
  const path = await fixture(t, 10, 10);
  await truncate(path, coverContract.maxInputBytes + 1);
  // When
  const action = () => processCover(path);
  // Then
  await assert.rejects(action, /30MiB/);
});

test("픽셀 상한을 초과하는 이미지 헤더를 거부한다", async (t) => {
  // Given
  const path = await fixture(t, 10, 10);
  await writeFile(path, '<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="10000"><rect width="100%" height="100%"/></svg>');
  // When
  const action = () => processCover(path);
  // Then
  await assert.rejects(action, /pixel limit/i);
});
