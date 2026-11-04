import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`PWA check failed: ${message}`);
  process.exitCode = 1;
}

function publicPath(url) {
  return path.join(root, "public", url.replace(/^\//, ""));
}

const manifestPath = path.join(root, "public", "manifest.webmanifest");
const serviceWorkerPath = path.join(root, "public", "sw.js");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.start_url !== "/") fail("manifest.start_url must be /");
if (manifest.scope !== "/") fail("manifest.scope must be /");
if (manifest.display !== "standalone") fail("manifest.display must be standalone");

if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
  fail("manifest must define install icons");
}

for (const icon of manifest.icons ?? []) {
  if (!icon.src) {
    fail("manifest icon is missing src");
    continue;
  }
  if (!existsSync(publicPath(icon.src))) {
    fail(`manifest icon is missing on disk: ${icon.src}`);
  }
}

const sw = await readFile(serviceWorkerPath, "utf8");
if (!sw.includes('const cacheName = "ewd-reading-v5";')) fail("approved baby artwork requires the v5 cache");
const appShellMatch = sw.match(/const appShell = \[([\s\S]*?)\];/);
if (!appShellMatch) fail("service worker appShell array not found");

const cachedUrls = [...(appShellMatch?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
if (!cachedUrls.includes("/assets/dragons/dragons-v2.png")) fail("dragon scene artwork must be cached");
const dragonArtwork = [
  "/assets/dragons/eggs/spotted.webp",
  "/assets/dragons/eggs/striped.webp",
  "/assets/dragons/eggs/diamond.webp",
  "/assets/dragons/habitats/lava-open-foreground.webp",
  "/assets/dragons/habitats/lava-stone-platform.webp",
  "/assets/dragons/habitats/lava-central-volcano.webp",
  "/assets/dragons/habitats/lava-waterfall.webp",
  "/assets/dragons/props/ancient-dragon-relic.webp",
  "/assets/dragons/props/lava-crystal.webp",
  "/assets/dragons/adult-fire.webp",
  "/assets/dragons/baby/neutral.webp",
  "/assets/dragons/baby/fire.webp",
  "/assets/dragons/baby/thunder.webp",
  "/assets/dragons/baby/ice.webp",
];
for (const url of dragonArtwork) {
  if (!cachedUrls.includes(url)) fail(`dragon artwork must be cached: ${url}`);
}
for (const url of cachedUrls) {
  if (url === "/") continue;
  if (!existsSync(publicPath(url))) {
    fail(`service worker cache target is missing on disk: ${url}`);
  }
}

if (!sw.includes("event.request.mode === \"navigate\"")) {
  fail("service worker must handle navigation fallback");
}

if (!process.exitCode) {
  console.log("PWA check passed");
}
