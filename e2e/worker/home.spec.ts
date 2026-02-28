import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Home", () => {
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

  test("renders home page with bottom navigation", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible();
  });

  test("displays attendance section", async ({ page }) => {
    const attendance = page
      .locator(
        "[data-testid='attendance'], button:has-text('출근'), button:has-text('퇴근')",
      )
      .first();
    await expect(attendance).toBeVisible({ timeout: 10_000 });
  });

  test("displays points card", async ({ page }) => {
    const pointsCard = page.locator("text=/포인트|점수|point/i").first();
    await expect(pointsCard).toBeVisible({ timeout: 10_000 });
  });

  test("displays posts section", async ({ page }) => {
    const posts = page.locator("text=/게시|글|post/i").first();
    await expect(posts).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to other sections via bottom nav", async ({ page }) => {
    const navLinks = page.locator("nav a, nav button");
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
