import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  test: {
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    environment: "node",
    environmentMatchGlobs: [
      ["**/components/**/*.test.tsx", "jsdom"],
      ["**/*.component.test.tsx", "jsdom"],
    ],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    pool: "forks",
    fileParallelism: false,
  },
});
