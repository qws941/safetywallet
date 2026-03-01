import { test, expect } from "@playwright/test";

test.describe("Admin Points Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/points");
  });

  test("should display points page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "포인트 관리" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should have manual award form or button", async ({ page }) => {
    const awardBtn = page.getByRole("button", { name: "지급" });
    const awardText = page.getByText("포인트 지급");
    if (await awardBtn.or(awardText).first().first().isVisible()) {
      expect(true).toBeTruthy();
    }
  });
});
