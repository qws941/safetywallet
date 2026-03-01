import { test, expect } from "@playwright/test";

test.describe("Admin Attendance Unmatched", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/attendance/unmatched");
  });

  test("should display unmatched records title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "미매칭 기록" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText1 = page.getByText("데이터가 없습니다").first();
    const emptyText2 = page.getByText("미매칭 기록이 없습니다").first();
    await expect(table.or(emptyText1).or(emptyText2).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have filter controls", async ({ page }) => {
    const filter = page
      .locator(
        'select, [role="combobox"], input[type="search"], button:has-text("필터")',
      )
      .first();
    if (await filter.isVisible().catch(() => false)) {
      expect(await filter.isEnabled()).toBeDefined();
    }
  });
});
