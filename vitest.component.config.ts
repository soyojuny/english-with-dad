import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "verification-artifacts/vitest-component",
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    include: ["tests/components/**/*.test.{ts,tsx}", "tests/hooks/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/support/component-setup.ts"],
    sequence: { hooks: "stack" },
  },
});
