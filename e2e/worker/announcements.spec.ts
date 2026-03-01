import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Announcements", () => {
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

  test("renders announcements page", async ({ page }) => {
    await page.goto("/announcements");
    await expect(
      page.locator("text=/공지|알림|announce/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays announcement cards or empty state", async ({ page }) => {
    await page.goto("/announcements");
    // Announcement cards use shadcn Card (no .card class, no data-testid)
    // Empty state shows 📭 emoji with i18n key string "announcements.empty"
    const cards = page.locator("h3");
    const emptyState = page.locator(
      "text=/📭|announcements\\.empty|공지사항이 없습니다|없습니다/",
    );
    await expect(cards.or(emptyState).first()).toBeVisible({ timeout: 10_000 });
  });

  test("announcement cards show type badges", async ({ page }) => {
    await page.goto("/announcements");
    // Cards use shadcn Card components — look for card-like structure
    const card = page.locator("h3").first();
    const hasCards = await card
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasCards) {
      // Type badges render as shadcn Badge with announcement type text
      const badge = page
        .locator("text=/RANKING|BEST_PRACTICE|우수|순위|안전|일반|중요/i")
        .first();
      await expect(badge).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "No announcements available");
    }
  });

  test("announcement cards are expandable", async ({ page }) => {
    await page.goto("/announcements");
    const card = page.locator("h3").first();
    const hasCards = await card
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasCards) {
      await card.click();
      const expanded = page
        .locator("[data-state='open'], text=/내용|content/i")
        .first();
      await expect(expanded).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "No announcements to expand");
    }
  });
});
