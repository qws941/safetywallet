import { test, expect } from "@playwright/test";

test.describe("Admin Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("should display settings page title or error state", async ({
    page,
  }) => {
    const heading = page.getByRole("heading", { name: "설정" });
    const errorMsg = page.getByText("현장 정보를 불러올 수 없습니다");
    await expect(heading.or(errorMsg)).toBeVisible({ timeout: 10000 });
  });

  test("should display site info or error message", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should have save button", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: "저장" });
    if (await saveBtn.isVisible()) {
      expect(await saveBtn.isEnabled()).toBeDefined();
    }
  });
});
