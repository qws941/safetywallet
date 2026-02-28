import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Quiz Take Flow", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await workerLogin(page);
    } catch (e) {
      if (e instanceof WorkerRateLimitError) {
        test.skip(true, "Worker login rate limited");
      }
      throw e;
    }
    // Use a known existing test quiz ID or expect a mock/fixture in real environment
    await page.goto("/education/quiz-take?id=test-quiz");
  });

  test("should display quiz details and allow submission", async ({ page }) => {
    // Wait for quiz content to load
    await page.waitForSelector("h1:has-text('Q1.')", { timeout: 10000 });

    // Answer SINGLE_CHOICE or OX question (assuming standard label structures)
    // We try to interact with standard radio buttons if they exist
    const radioInputs = page.locator('input[type="radio"]');
    if ((await radioInputs.count()) > 0) {
      await radioInputs.first().click();
    }

    // Attempt to submit
    const submitBtn = page.getByRole("button", { name: /제출|Submit/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Handle standard confirmation dialog if it appears
    const confirmBtn = page.getByRole("button", { name: /확인|Confirm/ });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Expect result screen
    await expect(page.getByText(/결과|Result/)).toBeVisible({ timeout: 10000 });
  });
});
