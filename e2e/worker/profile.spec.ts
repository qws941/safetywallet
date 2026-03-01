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
    // Profile shows: Avatar (AvatarFallback with first char of maskedName or 👷),
    // h2 with user?.nameMasked. No data-testid; name is masked.
    // Cannot mix CSS and text= selectors in one locator string — use .or()
    const userInfo = page
      .locator("h2")
      .or(page.locator("[class*='avatar']"))
      .first();
    await expect(userInfo).toBeVisible({ timeout: 10_000 });
  });

  test("displays push notification toggle", async ({ page }) => {
    await page.goto("/profile");
    // Switch component has aria-label="푸시 알림 수신"; also hardcoded <h3>푸시 알림</h3>
    // Cannot mix CSS and text= selectors — use .or()
    const toggle = page
      .locator("[role='switch']")
      .or(page.locator("[aria-label*='푸시']"))
      .or(page.locator("h3:has-text('푸시 알림')"))
      .first();
    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test("displays logout button", async ({ page }) => {
    await page.goto("/profile");
    // Button uses t("profile.logout") key — may render as Korean or literal key string
    // :has-text() only accepts plain strings, NOT regex — use .filter({ hasText: /regex/ })
    const logout = page
      .getByRole("button")
      .filter({ hasText: /로그아웃|logout|profile\.logout/i })
      .first();
    await expect(logout).toBeVisible({ timeout: 10_000 });
  });

  test("displays leave site option", async ({ page }) => {
    await page.goto("/profile");
    // Button uses t("profile.leaveSiteButton") key; disabled when !currentSiteId
    // :has-text() only accepts plain strings — use .filter({ hasText: /regex/ })
    const leave = page
      .getByRole("button")
      .filter({ hasText: /현장 나가기|현장 탈퇴|leave|leaveSite/i })
      .or(page.locator("text=/현장 나가기|현장 탈퇴|leaveSite/i"))
      .first();
    // May be disabled if no site assigned — just check it exists in DOM
    await expect(leave).toBeAttached({ timeout: 10_000 });
  });
});
