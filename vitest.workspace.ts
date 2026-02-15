import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/worker-app/vitest.config.ts",
      "apps/admin-app/vitest.config.ts",
      "apps/api-worker/vitest.config.ts",
      "packages/ui/vitest.config.ts",
      "packages/types/vitest.config.ts",
    ],
  },
});
