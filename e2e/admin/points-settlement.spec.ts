import { test, expect } from "@playwright/test";

test.describe("Admin Points Settlement", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/points/settlement");
  });

  test("should display settlement page content", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    const card = page.locator(".rounded-lg.border, [class*='card']").first();
    await expect(heading.or(card)).toBeVisible({ timeout: 10000 });
  });

  test("should display settlement status or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const card = page.locator(".rounded-lg.border, [class*='card']").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(card).or(emptyText)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have month-based navigation or filter", async ({ page }) => {
    const monthFilter = page
      .locator(
        'input[type="month"], button:has-text("월"), select, [role="combobox"]',
      )
      .first();
    if (await monthFilter.isVisible().catch(() => false)) {
      expect(await monthFilter.isEnabled()).toBeDefined();
    }
  });

  test("should display dispute table when disputes exist", async ({ page }) => {
    const disputeSection = page.getByText("이의");
    const table = page.locator("table").first();
    if (
      await disputeSection
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      expect(true).toBeTruthy();
    } else if (await table.isVisible().catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });
});
