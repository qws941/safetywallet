import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Profile", () => {
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

  test("renders profile page", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.locator("text=/프로필|내 정보|profile/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays user avatar or name", async ({ page }) => {
    await page.goto("/profile");
    const userInfo = page
      .locator("[data-testid='avatar'], img[alt*='avatar'], text=/김선민/")
      .first();
    await expect(userInfo).toBeVisible({ timeout: 10_000 });
  });

  test("displays push notification toggle", async ({ page }) => {
    await page.goto("/profile");
    const toggle = page
      .locator(
        "[role='switch'], input[type='checkbox'], button:has-text(/알림|notification|push/i)",
      )
      .first();
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test("displays logout button", async ({ page }) => {
    await page.goto("/profile");
    const logout = page.locator("button:has-text(/로그아웃|logout/i)").first();
    await expect(logout).toBeVisible({ timeout: 10_000 });
  });

  test("displays leave site option", async ({ page }) => {
    await page.goto("/profile");
    const leave = page
      .locator(
        "button:has-text(/현장 나가기|현장 탈퇴|leave/i), text=/현장 나가기|현장 탈퇴|leave/i",
      )
      .first();
    await expect(leave).toBeVisible({ timeout: 10_000 });
  });
});
