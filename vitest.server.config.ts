import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "verification-artifacts/vitest-server",
  test: {
    environment: "node",
    include: ["tests/server/**/*.test.ts"],
    setupFiles: ["./tests/support/common-setup.ts"],
  },
});
