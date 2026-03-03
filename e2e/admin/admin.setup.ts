import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth", "admin.json");
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin123";

setup("authenticate as admin", async ({ page }) => {
  setup.setTimeout(120000);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto("/login", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Already authenticated — /login may redirect to /dashboard
      if (/\/dashboard/.test(page.url())) {
        await page.context().storageState({ path: authFile });
        return;
      }

      // Wait for React hydration — button must exist before filling
      const loginButton = page.getByRole("button", { name: "로그인" });
      await loginButton.waitFor({ state: "visible", timeout: 15000 });

      await page.getByPlaceholder("admin").fill(ADMIN_USERNAME);
      await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);

      // Verify React state updated — button should enable
      await expect(loginButton).toBeEnabled({ timeout: 5000 });

      const loginResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes("/auth/admin/login") &&
          resp.request().method() === "POST",
        { timeout: 30000 },
      );

      await loginButton.click({ noWaitAfter: true });

      // Gracefully handle response timeout — navigation may still succeed
      await loginResponsePromise.catch(() => null);

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
      await page.context().storageState({ path: authFile });
      return;
    } catch {
      if (attempt < 2 && !page.isClosed()) {
        await page.waitForTimeout(15000);
      }
    }
  }
  throw new Error("Failed to authenticate as admin after 3 attempts");
});
