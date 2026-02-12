import { defineConfig } from "@playwright/test";

// Production URLs as defaults
// Override with env vars for staging/local:
//   WORKER_APP_URL=https://staging.safework2-worker.pages.dev \
//   ADMIN_APP_URL=https://staging.safework2-admin.pages.dev \
//   API_URL=https://safework2-api-dev.jclee.workers.dev \
//   npx playwright test --grep @smoke
const WORKER_APP_URL =
  process.env.WORKER_APP_URL ?? "https://safework2.jclee.me";
const ADMIN_APP_URL =
  process.env.ADMIN_APP_URL ?? "https://admin.safework2.jclee.me";
const rawApiUrl = process.env.API_URL ?? "https://safework2.jclee.me/api/";
const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`;

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [
    {
      name: "api",
      testDir: "./api",
      use: {
        baseURL: API_URL,
      },
    },
    {
      name: "worker-app",
      testDir: "./worker-app",
      use: {
        baseURL: WORKER_APP_URL,
        headless: true,
      },
    },
    {
      name: "admin-app",
      testDir: "./admin-app",
      use: {
        baseURL: ADMIN_APP_URL,
        headless: true,
      },
    },
    {
      name: "cross-app",
      testDir: "./cross-app",
      use: {
        headless: true,
      },
    },
  ],
});
