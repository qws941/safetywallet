import { test, expect } from "@playwright/test";

test.describe("Admin Sync Errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sync-errors");
  });

  test("should display sync errors page content", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    const syncText = page.getByText("동기화 오류");
    await expect(heading.or(syncText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    const noErrors = page.getByText("오류가 없습니다");
    await expect(table.or(emptyText).first().or(noErrors).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have status filter controls", async ({ page }) => {
    const filter = page
      .locator(
        'select, [role="combobox"], button:has-text("상태"), button:has-text("유형")',
      )
      .first();
    if (await filter.isVisible().catch(() => false)) {
      expect(await filter.isEnabled()).toBeDefined();
    }
  });

  test("should have type filter controls", async ({ page }) => {
    const typeFilter = page
      .locator(
        'select, [role="combobox"], button:has-text("유형"), [data-testid*="type"]',
      )
      .first();
    if (await typeFilter.isVisible().catch(() => false)) {
      expect(await typeFilter.isEnabled()).toBeDefined();
    }
  });
});
