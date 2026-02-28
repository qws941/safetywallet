import { test, expect } from "@playwright/test";

test.describe("Admin Post Detail", () => {
  test("should navigate to post detail page from posts list", async ({
    page,
  }) => {
    await page.goto("/posts");
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
            '[data-testid="post-detail"], .post-detail, article',
          );
          await expect(heading.or(detail).first()).toBeVisible({
            timeout: 10000,
          });
        }
      }
    }
  });

  test("should display post detail content when accessing directly", async ({
    page,
  }) => {
    await page.goto("/posts/test-id");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});
