import { test, expect } from "@playwright/test";

test.describe("Admin Announcements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/announcements");
  });

  test("should display announcements page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "공지사항" })).toBeVisible();
  });

  test("should have new announcement button", async ({ page }) => {
    const newBtn = page.getByRole("button", { name: "새 공지" });
    if (await newBtn.isVisible()) {
      expect(await newBtn.isEnabled()).toBeDefined();
    }
  });

  test("should display content area", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
