/// <reference types="vitest" />

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.ts"],
    exclude: [
      "node_modules/",
      "dist/",
      "**/*.d.ts",
      "src/types/light.test.ts",
      "src/types/switch.test.ts",
      "src/services/*.test.ts",
    ],
    testTimeout: 10000,
    server: {
      deps: {
        inline: ["./src/types/light.ts", "./src/types/switch.ts"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/test/**",
        "**/*.test.*",
        "**/*.spec.*",
        "src/test/setup.ts",
      ],
      thresholds: {
        global: {
          functions: 80,
          lines: 80,
          statements: 80,
          branches: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
      "@/types": path.resolve(__dirname, "../src/types"),
      "@/utils": path.resolve(__dirname, "../src/utils"),
      "@/services": path.resolve(__dirname, "../src/services"),
      "@/mocks": path.resolve(__dirname, "../src/mocks"),
      "@/test": path.resolve(__dirname, "../src/test"),
    },
  },
});
