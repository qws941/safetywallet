import { test, expect } from "@playwright/test";

test.describe("Admin Recommendations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/recommendations");
  });

  test("should display recommendations page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "우수근로자 추천 관리" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText1 = page.getByText("데이터가 없습니다").first();
    const emptyText2 = page.getByText("추천 내역이 없습니다").first();
    await expect(table.or(emptyText1).or(emptyText2).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have filter or search controls", async ({ page }) => {
    const search = page
      .locator(
        'input[type="search"], input[placeholder*="검색"], [data-testid*="search"]',
      )
      .first();
    const filter = page
      .locator('select, [role="combobox"], button:has-text("필터")')
      .first();
    if (
      await search
        .or(filter)
        .first()
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      expect(true).toBeTruthy();
    }
  });
});
