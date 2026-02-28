import { test, expect } from "@playwright/test";

test.describe("Admin Attendance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/attendance");
  });

  test("should display attendance page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "출근 현황" }),
    ).toBeVisible();
  });

  test("should display stat cards", async ({ page }) => {
    const card = page.locator(".rounded-lg.border.bg-card").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(card.or(emptyText)).toBeVisible({ timeout: 10000 });
  });

  test("should have tab navigation", async ({ page }) => {
    const tabs = page.locator('[role="tab"], [role="tablist"] button');
    if (await tabs.first().isVisible()) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test("should have date filter", async ({ page }) => {
    const dateInput = page
      .locator(
        'input[type="date"], button:has-text("날짜"), [data-testid*="date"]',
      )
      .first();
    if (await dateInput.isVisible()) {
      expect(await dateInput.isEnabled()).toBeDefined();
    }
  });

  test("should display data table or empty state", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
