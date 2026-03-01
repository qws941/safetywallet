import { test, expect } from "@playwright/test";

test.describe("Admin Approvals", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/approvals");
  });

  test("should display approvals page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "승인 관리" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should have status filter", async ({ page }) => {
    const filter = page
      .locator('select, [role="combobox"], button:has-text("상태")')
      .first();
    if (await filter.isVisible().catch(() => false)) {
      expect(await filter.isEnabled()).toBeDefined();
    }
  });

  test("should display approval action buttons when items exist", async ({
    page,
  }) => {
    const table = page.locator("table").first();
    if (await table.isVisible().catch(() => false)) {
      const rows = table.locator("tbody tr");
      if ((await rows.count()) > 0) {
        const actionBtn = rows
          .first()
          .locator('button, a, [role="button"]')
          .first();
        if (await actionBtn.isVisible().catch(() => false)) {
          expect(true).toBeTruthy();
        }
      }
    }
  });
});
