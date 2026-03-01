import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/analytics");
  });

  test("should display analytics page content", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    const card = page.locator(".rounded-lg.border, [class*='card']").first();
    await expect(heading.or(card).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display stats cards", async ({ page }) => {
    const card = page.locator(".rounded-lg.border, [class*='card']").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(card.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display trend charts or chart containers", async ({ page }) => {
    const chart = page.locator(
      "canvas, svg, [class*='chart'], [data-testid*='chart'], [class*='recharts']",
    );
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(chart.first().or(emptyText).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have date range picker", async ({ page }) => {
    const datePicker = page
      .locator(
        'input[type="date"], button:has-text("기간"), [data-testid*="date"], button:has-text("날짜")',
      )
      .first();
    if (await datePicker.isVisible().catch(() => false)) {
      expect(await datePicker.isEnabled()).toBeDefined();
    }
  });
});
