/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api-worker",
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/fas-sync.ts",
        "src/lib/face-blur.ts",
        "src/lib/web-push.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/__tests__/**",
        "src/lib/constants.ts",
        "src/types.ts",
        "src/lib/observability.ts",
        "src/db/schema.ts",
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
