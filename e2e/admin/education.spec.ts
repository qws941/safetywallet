import { test, expect } from "@playwright/test";

test.describe("Admin Education Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/education");
  });

  test("should display education page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "교육 관리" }),
    ).toBeVisible();
  });

  test("should have tab buttons", async ({ page }) => {
    const tabs = page.locator('[role="tab"], [role="tablist"] button');
    if (await tabs.first().isVisible()) {
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test("should display content area", async ({ page }) => {
    const content = page
      .locator("table, form, .rounded-lg.border.bg-card")
      .first();
    const emptyText = page.getByText("데이터가 없습니다");
    const siteMsg = page.getByText("현장을 선택해주세요");
    await expect(content.or(emptyText).or(siteMsg)).toBeVisible({
      timeout: 10000,
    });
  });
});
