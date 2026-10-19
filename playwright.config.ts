import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

process.env.TMPDIR ??= resolve("verification-artifacts/tmp");
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve("verification-artifacts/playwright-browsers");
mkdirSync(process.env.TMPDIR, { recursive: true });
const artifacts = resolve(`verification-artifacts/browser-${Date.now()}-${process.pid}`);

export default defineConfig({
  outputDir: `${artifacts}/results`,
  reporter: [["list"], ["json", { outputFile: `${artifacts}/report.json` }]],
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  use: {
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Seoul",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "client-http", testDir: "./tests/browser/client" },
    { name: "next-auth-http", testDir: "./tests/browser/next" },
    { name: "next-pwa", testDir: "./tests/browser/pwa", use: { serviceWorkers: "allow" } },
  ],
});
