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
      provider: "v8",
      include: [
        "src/components/providers.tsx",
        "src/components/sidebar.tsx",
        "src/lib/api.ts",
      ],
      exclude: [
        "**/lib/utils.ts",
        "src/**/*.test.{ts,tsx}",
        "src/__tests__/**",
        "src/app/**",
        "src/types/**",
        "src/hooks/use-api-base.ts",
        "src/hooks/use-api.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
