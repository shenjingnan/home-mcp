import path from "node:path";
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
  // 使用tsup内置的alias支持，采用绝对路径确保一致性
  alias: {
    "@": path.resolve(__dirname, "../src"),
    "@/types": path.resolve(__dirname, "../src/types"),
    "@/utils": path.resolve(__dirname, "../src/utils"),
    "@/services": path.resolve(__dirname, "../src/services"),
    "@/mocks": path.resolve(__dirname, "../src/mocks"),
    "@/test": path.resolve(__dirname, "../src/test"),
  },
});
