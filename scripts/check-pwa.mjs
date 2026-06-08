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
const appShellMatch = sw.match(/const appShell = \[([\s\S]*?)\];/);
if (!appShellMatch) fail("service worker appShell array not found");

const cachedUrls = [...(appShellMatch?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
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
