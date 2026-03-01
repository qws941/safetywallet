import { test, expect } from "@playwright/test";

test.describe("Admin Audit Log", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/audit");
  });

  test("should display audit page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "감사 로그" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should have search functionality", async ({ page }) => {
    const search = page
      .locator(
        'input[type="search"], input[placeholder*="검색"], input[placeholder*="search"]',
      )
      .first();
    if (await search.isVisible()) {
      await search.fill("test");
      await search.clear();
    }
  });
});
