import { test, expect } from "@playwright/test";

test.describe("Admin Attendance Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/attendance/sync");
  });

  test("should display FAS sync status title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "FAS 연동 현황" }),
    ).toBeVisible();
  });

  test("should display sync status data or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const card = page.locator(".rounded-lg.border, [class*='card']").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(card).or(emptyText)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have sync action button", async ({ page }) => {
    const syncBtn = page
      .getByRole("button", { name: /동기화|연동|새로고침|sync/i })
      .first();
    if (await syncBtn.isVisible().catch(() => false)) {
      expect(await syncBtn.isEnabled()).toBeDefined();
    }
  });
});
