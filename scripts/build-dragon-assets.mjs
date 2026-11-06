import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "assets/dragons/source");
const output = resolve(root, "public/assets/dragons");
const images = [
  ...["spotted", "striped", "diamond"].map((name) => [`eggs/${name}`, `eggs/${name}`, 1024]),
  ...["lava-open-foreground", "lava-stone-platform", "lava-central-volcano", "lava-waterfall"]
    .map((name) => [`backgrounds/${name}`, `habitats/${name}`, 1600]),
  ...["ancient-dragon-relic", "lava-crystal"].map((name) => [`props/${name}`, `props/${name}`, 640]),
  ...["neutral", "fire", "ice", "blink", "breathe"].map((name) => [`baby/${name}`, `baby/${name}`, 1024]),
  ["baby/walk-bde", "baby/walk-bde", 2400],
  ["baby/fire-walk-bde", "baby/fire-walk-bde", 2400],
  ["baby/thunder-walk-bde", "baby/thunder-walk-bde", 2400],
  ["baby/ice-walk-bde", "baby/ice-walk-bde", 2400],
  ["baby/sit-sequence", "baby/sit-sequence", 5120],
  ["baby/fire-sit-sequence", "baby/fire-sit-sequence", 5120],
  ["baby/ice-sit-sequence", "baby/ice-sit-sequence", 4096],
  ["baby/thunder-sit-sequence", "baby/thunder-sit-sequence", 5120],
  ["baby/lightning", "baby/thunder", 1024],
  ...["fire", "lightning", "ice"].flatMap((element) => ["blink", "breathe"].map((motion) =>
    [`baby/${element}-${motion}`, `baby/${element === "lightning" ? "thunder" : element}-${motion}`, 1024])),
  ["adult-fire/adult", "adult-fire", 1200],
  ...["blink-closed", "breathe-in", "01-mouth-opening", "02-forward", "03-head-rising", "04-head-raised", "charge"]
    .map((name) => [`adult-fire/${name}`, `adult-fire/${name}`, 1200]),
  ["effects/fire-stream", "effects/fire-stream", 1200],
];

for (const [input, name, width] of images) {
  const file = resolve(output, `${name}.webp`);
  await mkdir(dirname(file), { recursive: true });
  await sharp(resolve(source, `${input}.png`)).resize({ width, withoutEnlargement: true })
    .webp((name.endsWith("walk-bde") || name.endsWith("sit-sequence")) ? { lossless: true } : { quality: 90, alphaQuality: 100 }).toFile(file);
}
console.log(`Dragon assets: ${images.length} WebP files built from assets/dragons/source`);
