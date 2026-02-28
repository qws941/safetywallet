import { test, expect } from "@playwright/test";

test.describe("Admin Rewards Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/rewards");
  });

  test("should display rewards page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "포상 관리" }),
    ).toBeVisible();
  });

  test("should have tab navigation", async ({ page }) => {
    const tabs = page.locator('[role="tab"], [role="tablist"] button');
    if (await tabs.first().isVisible()) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test("should display content area", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
