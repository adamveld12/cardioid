import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 5000,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".bin"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", ".bin/", "**/*.{test,spec}.{js,ts}"],
    },
  },
  resolve: {
    alias: {
      // shared: "../shared/src",
    },
  },
});
