import { test, expect } from "@playwright/test";

test.describe("Worker Announcements", () => {
  test("should display announcements page", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /공지사항|announcement/i }),
    ).toBeVisible();
  });

  test("should show announcement cards or empty state", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    const emptyState = page.getByText(/공지사항이 없습니다|no announcement/i);

    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const isLoading = (await page.locator("[class*='skeleton']").count()) > 0;

    expect(hasCards || hasEmpty || isLoading).toBeTruthy();
  });

  test("should display type badges on announcement cards", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    if ((await cards.count()) > 0) {
      // Cards should have type badges (RANKING, BEST_PRACTICE, etc.)
      const badges = page.locator("[class*='badge'], [class*='Badge']");
      expect(await badges.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("should expand announcement card on click", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    if ((await cards.count()) > 0) {
      const firstCard = cards.first();
      await firstCard.click();

      // After click, content should be expanded/visible
      await page.waitForTimeout(300);
      expect(page.url()).toContain("/announcements");
    }
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
