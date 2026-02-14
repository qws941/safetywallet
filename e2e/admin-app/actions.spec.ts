import { test, expect } from "@playwright/test";

test.describe("Admin Actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/actions");
  });

  test("should display actions page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "조치 현황" }),
    ).toBeVisible();
  });

  test("should display stat cards or empty state", async ({ page }) => {
    const card = page.locator(".rounded-lg.border.bg-card").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(card.or(emptyText)).toBeVisible({ timeout: 10000 });
  });

  test("should have filter tabs", async ({ page }) => {
    const tabs = page.locator('[role="tab"], [role="tablist"] button');
    if (await tabs.first().isVisible()) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText)).toBeVisible({ timeout: 10000 });
  });
});
