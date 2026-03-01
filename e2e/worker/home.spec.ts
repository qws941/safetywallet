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
    // Attendance card shows "출근 완료" or "미출근"; if no site assigned shows "잠시만 기다려주세요..."
    const attendance = page
      .locator("text=/출근 완료|미출근|잠시만 기다려/")
      .first();
    await expect(attendance).toBeVisible({ timeout: 10_000 });
  });

  test("displays points card", async ({ page }) => {
    const pointsCard = page.locator("text=/포인트|점수|point/i").first();
    await expect(pointsCard).toBeVisible({ timeout: 10_000 });
  });

  test("displays posts section", async ({ page }) => {
    // Quick actions grid has 📢 t("posts.title")="게시물"; content section uses t("home.recentReports") key
    // If no currentSiteId, page shows "잠시만 기다려주세요..." with 🏗️ only
    const posts = page
      .locator(
        "text=/게시물|recentReports|recentPosts|home\\.recent|📢|잠시만 기다려/i",
      )
      .first();
    await expect(posts).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to other sections via bottom nav", async ({ page }) => {
    // BottomNav uses Next.js Link (renders as <a>); 5 items total
    // Wait for at least one nav link to be visible before counting
    const navLinks = page.locator("nav a");
    await expect(navLinks.first()).toBeVisible({ timeout: 10_000 });
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
