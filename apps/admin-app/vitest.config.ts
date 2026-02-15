/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src") + "/",
    },
  },
  test: {
    name: "admin-app",
    root: __dirname,
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    alias: {
      "@/": path.resolve(__dirname, "./src") + "/",
    },
    coverage: {
      exclude: ["**/lib/utils.ts"],
    },
  },
});
