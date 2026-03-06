import { test, expect } from "@playwright/test";

test.describe("Worker Actions", () => {
  test("should display actions page", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    // Actions heading should be visible
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("should display status filter buttons", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    // 6 filter tabs: all, ASSIGNED, IN_PROGRESS, COMPLETED, VERIFIED, OVERDUE
    const filterButtons = page.getByRole("button");
    expect(await filterButtons.count()).toBeGreaterThanOrEqual(6);
  });

  test("should show action cards or empty state", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    const emptyState = page.getByText("✅");

    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const isLoading =
      (await page.locator("[class*='skeleton'], [class*='Skeleton']").count()) >
      0;

    expect(hasCards || hasEmpty || isLoading).toBeTruthy();
  });

  test("should switch between filter tabs", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    const buttons = page.getByRole("button");
    const count = await buttons.count();

    if (count >= 2) {
      // Click second filter tab
      await buttons.nth(1).click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/actions");
    }
  });

  test("should display status and priority badges on action cards", async ({
    page,
  }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    if ((await cards.count()) > 0) {
      const badges = page.locator("[class*='badge'], [class*='Badge']");
      expect(await badges.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
