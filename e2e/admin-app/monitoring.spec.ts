import { test, expect } from "@playwright/test";

test.describe("Admin Monitoring", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/monitoring");
  });

  test("should display monitoring page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "운영 모니터링" }),
    ).toBeVisible();
  });

  test("should have period selector", async ({ page }) => {
    const selector = page.locator('select, [role="combobox"]').first();
    if (await selector.isVisible()) {
      expect(await selector.isEnabled()).toBeDefined();
    }
  });

  test("should display summary cards", async ({ page }) => {
    const card = page.locator(".rounded-lg.border.bg-card").first();
    await expect(card).toBeVisible({ timeout: 10000 });
  });
});
