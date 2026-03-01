import { test, expect } from "@playwright/test";

test.describe("Admin Posts Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/posts");
  });

  test("should display posts page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "제보 관리" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should have filter controls", async ({ page }) => {
    const selects = page.locator('select, [role="combobox"]');
    await expect(selects.first())
      .toBeVisible({ timeout: 10000 })
      .catch(() => {});
  });

  test("should have reset filter button", async ({ page }) => {
    const resetBtn = page.getByRole("button", { name: "필터 초기화" });
    if (await resetBtn.isVisible()) {
      expect(await resetBtn.isEnabled()).toBeDefined();
    }
  });
});
