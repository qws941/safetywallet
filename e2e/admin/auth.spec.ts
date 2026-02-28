import { test, expect } from "@playwright/test";
import { adminLogin, expectAdminShellVisible } from "./helpers";

test.describe("Admin Auth Flow", () => {
  test.describe.configure({ timeout: 120_000 });
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should redirect unauthenticated user from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should complete full auth lifecycle @smoke", async ({ page }) => {
    await adminLogin(page);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await expectAdminShellVisible(page);
  });

  test("should maintain auth state across navigations", async ({ page }) => {
    await adminLogin(page);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await page.goto("/posts");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/members");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
