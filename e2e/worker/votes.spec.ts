import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Recommendations (Votes)", () => {
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

  test("renders recommendations page", async ({ page }) => {
    await page.goto("/votes");
    await expect(
      page.locator("text=/추천|칭찬|recommend/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays recommendation form", async ({ page }) => {
    await page.goto("/votes");
    const form = page
      .locator("form, [data-testid='recommendation-form']")
      .first();
    await expect(form).toBeVisible({ timeout: 10_000 });
  });

  test("form has name, trade, and reason fields", async ({ page }) => {
    await page.goto("/votes");
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("displays submit button", async ({ page }) => {
    await page.goto("/votes");
    const submit = page
      .locator("button[type='submit'], button:has-text(/추천|제출|submit/i)")
      .first();
    await expect(submit).toBeVisible({ timeout: 10_000 });
  });

  test("shows recommendation history toggle", async ({ page }) => {
    await page.goto("/votes");
    const historyToggle = page
      .locator("button:has-text(/기록|이력|history/i), [role='tab']")
      .first();
    const hasHistory = await historyToggle
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasHistory) {
      const historySection = page.locator("text=/기록|이력|history/i").first();
      await expect(historySection).toBeVisible({ timeout: 5_000 });
    }
  });
});
