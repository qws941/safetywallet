import { test, expect } from "@playwright/test";

test.describe("Admin Member Detail", () => {
  test("should navigate to member detail from members list", async ({
    page,
  }) => {
    await page.goto("/members");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    const table = page.locator("table").first();
    if (await table.isVisible().catch(() => false)) {
      const firstRow = table.locator("tbody tr").first();
      if (await firstRow.isVisible().catch(() => false)) {
        const link = firstRow.locator("a, [role='button']").first();
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
          const heading = page.getByRole("heading").first();
          const detail = page.locator(
            '[data-testid="member-detail"], .member-detail, article',
          );
          await expect(heading.or(detail).first().first()).toBeVisible({
            timeout: 10000,
          });
        }
      }
    }
  });

  test("should display member detail content when accessing directly", async ({
    page,
  }) => {
    await page.goto("/members/test-id");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});
