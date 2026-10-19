import { defineConfig } from "vitest/config";

process.env.TZ = "Asia/Seoul";

export default defineConfig({
  cacheDir: "verification-artifacts/vitest-server",
  test: {
    environment: "node",
    include: ["tests/server/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "lib/**/*.ts", "middleware.ts", "public/sw.js"],
      exclude: ["**/*.d.ts", "lib/reading-types.ts"],
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "coverage/server",
    },
    setupFiles: ["./tests/support/common-setup.ts"],
  },
});
