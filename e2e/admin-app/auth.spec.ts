import { test, expect } from "@playwright/test";

test.describe("Admin Auth Flow", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should redirect unauthenticated user from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should complete full auth lifecycle @smoke", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    await page.getByPlaceholder("admin").fill("admin");
    await page.getByPlaceholder("••••••••").fill("admin123");

    // Wait for the login API response before asserting navigation
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/auth/admin/login") && resp.status() === 200,
        { timeout: 20000 },
      ),
      page.getByRole("button", { name: "로그인" }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test("should maintain auth state across navigations", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin").fill("admin");
    await page.getByPlaceholder("••••••••").fill("admin123");

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/auth/admin/login") && resp.status() === 200,
        { timeout: 20000 },
      ),
      page.getByRole("button", { name: "로그인" }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await page.goto("/posts");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/members");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
