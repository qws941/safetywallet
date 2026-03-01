import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Actions", () => {
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

  test("renders actions list page", async ({ page }) => {
    await page.goto("/actions");
    await expect(page.locator("h2")).toBeVisible({ timeout: 10_000 });
  });

  test("displays status filter chips", async ({ page }) => {
    await page.goto("/actions");
    const filters = page
      .locator("button, [role='tab']")
      .filter({ hasText: /전체|진행|완료|대기/i });
    await expect(filters.first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state or action cards", async ({ page }) => {
    await page.goto("/actions");
    // Action cards have status badges (배정됨/진행 중/완료됨 from ko.ts) or
    // empty state shows ✅ emoji with i18n key strings (actions.list.empty)
    const cards = page.locator(
      "text=/배정됨|진행 중|완료됨|확인됨|기한 초과|actions\\.status/",
    );
    const emptyState = page.locator(
      "text=/✅|actions\\.list\\.empty|조치 사항이 없습니다/",
    );
    await expect(cards.or(emptyState).first()).toBeVisible({ timeout: 10_000 });
  });

  test("action detail page loads with query param", async ({ page }) => {
    await page.goto("/actions");
    // Only look for explicit detail links in main content — exclude nav links
    const actionCard = page
      .locator(
        "main a[href*='/actions/view'], main a[href*='/actions/']:not(nav a)",
      )
      .first();
    const hasActions = await actionCard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasActions) {
      await actionCard.click();
      await expect(page).toHaveURL(/\/actions\/view\?id=/);
      await expect(page.locator("text=/상태|status/i").first()).toBeVisible({
        timeout: 10_000,
      });
    } else {
      test.skip(true, "No actions available to view");
    }
  });
});
