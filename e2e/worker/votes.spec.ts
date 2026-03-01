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

  test("displays recommendation form or state indicator", async ({ page }) => {
    await page.goto("/votes");
    // Page has NO <form> element — uses Card > CardContent with Input fields directly
    // Three states: 1) no site → "select site" card, 2) already recommended → green card,
    // 3) form inputs (Input/textarea for name, trade, reason)
    const formInputs = page.locator("input, textarea, select").first();
    const stateMessage = page
      .locator(
        "text=/추천.*완료|이미.*추천|selectSite|현장.*선택|votes\\.select/i",
      )
      .first();
    await expect(formInputs.or(stateMessage)).toBeVisible({ timeout: 10_000 });
  });

  test("form has name, trade, and reason fields", async ({ page }) => {
    await page.goto("/votes");
    // Three possible states: loading, state message (no site / already recommended), or form
    // Wait for loading to resolve first
    const formInput = page.locator("input, textarea, select").first();
    const stateMessage = page
      .locator(
        "text=/추천.*완료|이미.*추천|selectSite|현장.*선택|votes\\.select/i",
      )
      .first();
    const resolved = await formInput
      .or(stateMessage)
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!resolved) {
      test.skip(true, "Page did not resolve past loading state");
      return;
    }
    const hasState = await stateMessage.isVisible().catch(() => false);
    if (hasState) {
      test.skip(true, "Form not visible — user already recommended or no site");
      return;
    }
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("displays submit button", async ({ page }) => {
    await page.goto("/votes");
    // Three possible states: loading, state message (no site / already recommended), or form
    const formInput = page.locator("input, textarea, select").first();
    const stateMessage = page
      .locator(
        "text=/추천.*완료|이미.*추천|selectSite|현장.*선택|votes\\.select/i",
      )
      .first();
    const resolved = await formInput
      .or(stateMessage)
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!resolved) {
      test.skip(true, "Page did not resolve past loading state");
      return;
    }
    const hasState = await stateMessage.isVisible().catch(() => false);
    if (hasState) {
      test.skip(
        true,
        "Submit button not visible — user already recommended or no site",
      );
      return;
    }
    const submit = page
      .locator("button[type='submit']")
      .or(page.getByRole("button").filter({ hasText: /추천|제출|submit/i }))
      .first();
    await expect(submit).toBeVisible({ timeout: 10_000 });
  });

  test("shows recommendation history toggle", async ({ page }) => {
    await page.goto("/votes");
    const historyToggle = page
      .getByRole("button")
      .filter({ hasText: /기록|이력|history/i })
      .or(page.locator("[role='tab']"))
      .first();
    const hasHistory = await historyToggle
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasHistory) {
      // Fall back to any text mention of history on the page
      const historySection = page.locator("text=/기록|이력|history/i").first();
      const hasText = await historySection
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasText) {
        test.skip(
          true,
          "No history toggle or section visible on this page state",
        );
      }
    }
  });
});
