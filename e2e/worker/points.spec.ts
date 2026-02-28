import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Points", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    try {
      await workerLogin(page);
    } catch (e) {
      if (e instanceof WorkerRateLimitError) {
        test.skip(true, "Worker login rate limited");
        return;
      }
      throw e;
    }
    if (!page.url().includes("/home")) {
      throw new Error(`worker login did not land on home: ${page.url()}`);
    }
  });

  test("renders points page", async ({ page }) => {
    await page.goto("/points");
    await expect(page.locator("text=/포인트|점수|point/i").first()).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("displays points card with balance", async ({ page }) => {
    await page.goto("/points");
    const pointsCard = page.locator("text=/포인트|잔액|balance/i").first();
    await expect(pointsCard).toBeVisible({ timeout: 10_000 });
  });

  test("displays ranking section", async ({ page }) => {
    await page.goto("/points");
    const ranking = page.locator("text=/순위|랭킹|ranking/i").first();
    await expect(ranking).toBeVisible({ timeout: 10_000 });
  });

  test("shows ranking tabs for monthly and cumulative", async ({ page }) => {
    await page.goto("/points");
    const tabs = page
      .locator("button, [role='tab']")
      .filter({ hasText: /월간|누적|monthly|cumulative/i });
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("displays leaderboard entries", async ({ page }) => {
    await page.goto("/points");
    const leaderboard = page
      .locator(
        "text=/1위|2위|3위|medal|trophy/i, [data-testid='leaderboard-entry']",
      )
      .first();
    const hasLeaderboard = await leaderboard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasLeaderboard) {
      const emptyState = page.locator("text=/데이터|없습니다|empty/i").first();
      await expect(emptyState).toBeVisible({ timeout: 5_000 });
    }
  });
});
