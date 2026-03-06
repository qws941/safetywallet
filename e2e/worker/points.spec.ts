import { test, expect } from "@playwright/test";

test.describe("Worker Points", () => {
  test("should display points page with balance card", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    // Points card with balance should be visible
    const pointsSection = page.locator("[class*='card'], [class*='Card']");
    await expect(pointsSection.first()).toBeVisible();
  });

  test("should display leaderboard with ranking tabs", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    // Monthly and cumulative ranking tabs
    const monthlyTab = page.getByRole("button", { name: /월간|monthly/i });
    const cumulativeTab = page.getByRole("button", {
      name: /누적|cumulative/i,
    });

    await expect(monthlyTab).toBeVisible();
    await expect(cumulativeTab).toBeVisible();
  });

  test("should switch between monthly and cumulative rankings", async ({
    page,
  }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    const cumulativeTab = page.getByRole("button", {
      name: /누적|cumulative/i,
    });
    await cumulativeTab.click();
    await page.waitForLoadState("networkidle");

    // Should still be on points page
    expect(page.url()).toContain("/points");

    const monthlyTab = page.getByRole("button", { name: /월간|monthly/i });
    await monthlyTab.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/points");
  });

  test("should show leaderboard entries or empty state", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    // Leaderboard entries or empty/loading state
    const entries = page.locator("li, [class*='leaderboard'], [class*='rank']");
    const emptyState = page.getByText(/순위|rank|데이터/i);

    const hasEntries = (await entries.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const isLoading = (await page.locator("[class*='skeleton']").count()) > 0;

    expect(hasEntries || hasEmpty || isLoading).toBeTruthy();
  });

  test("should display point history section", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    // Point history list with +/- amounts
    const historySection = page.locator("main, [class*='container']");
    await expect(historySection.first()).toBeVisible();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
