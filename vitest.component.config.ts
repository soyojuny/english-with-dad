import { defineConfig } from "vitest/config";

process.env.TZ = "Asia/Seoul";

export default defineConfig({
  cacheDir: "verification-artifacts/vitest-component",
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    include: ["tests/components/**/*.test.{ts,tsx}", "tests/hooks/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "lib/**/*.ts", "middleware.ts", "public/sw.js"],
      exclude: ["**/*.d.ts", "lib/reading-types.ts"],
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "coverage/component",
    },
    setupFiles: ["./tests/support/component-setup.ts"],
    sequence: { hooks: "stack" },
  },
});
