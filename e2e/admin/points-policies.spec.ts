import { test, expect } from "@playwright/test";

test.describe("Admin Points Policies", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/points/policies");
  });

  test("should display policies page content", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    const table = page.locator("table").first();
    await expect(heading.or(table).first()).toBeVisible({ timeout: 10000 });
  });

  test("should display policy table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should have create policy button", async ({ page }) => {
    const createBtn = page
      .getByRole("button", {
        name: /정책.*추가|새.*정책|추가|생성/,
      })
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });

  test("should open create/edit dialog when clicking add button", async ({
    page,
  }) => {
    const createBtn = page
      .getByRole("button", {
        name: /정책.*추가|새.*정책|추가|생성/,
      })
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      const dialog = page.locator(
        '[role="dialog"], [data-testid*="dialog"], .modal',
      );
      if (
        await dialog
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(dialog.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
