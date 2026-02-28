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
    const content = page
      .locator(
        "[data-testid='action-card'], [data-testid='empty-state'], text=/조치|없습니다|action/i",
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test("action detail page loads with query param", async ({ page }) => {
    await page.goto("/actions");
    const actionCard = page
      .locator("a[href*='/actions/view'], [data-testid='action-card']")
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
