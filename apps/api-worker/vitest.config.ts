/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api-worker",
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
