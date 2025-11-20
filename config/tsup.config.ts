import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  outDir: "dist",
  dts: true,
  sourcemap: true,
  clean: true,
  bundle: true,
  minify: false,
  splitting: false,
  platform: "node",
  target: "node18",
  external: [],
  tsconfig: "tsconfig.json",
  // 使用tsup内置的alias支持
  alias: {
    "@": "./src",
    "@/types": "./src/types",
    "@/utils": "./src/utils",
    "@/services": "./src/services",
    "@/mocks": "./src/mocks",
    "@/test": "./src/test",
  },
});
