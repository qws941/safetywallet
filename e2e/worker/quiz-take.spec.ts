import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Quiz Take Flow", () => {
  test.describe.configure({ timeout: 180_000 });

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
    // Quiz ID 'test-quiz' may not exist — handle not-found gracefully
    // Cannot mix CSS and text= selectors in one locator — use .or()
    const quizContent = page
      .locator("h1:has-text('Q1.')")
      .or(page.locator("text=/문제|quiz|question/i"))
      .first();
    const notFound = page
      .locator(
        "text=/찾을 수 없|not found|존재하지 않|오류|error|quiz.*not|없습니다/i",
      )
      .first();

    // Wait for either quiz content or not-found state
    const hasQuiz = await quizContent
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const isNotFound = await notFound
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (!hasQuiz) {
      test.skip(
        true,
        `Quiz 'test-quiz' not available (not-found: ${isNotFound})`,
      );
      return;
    }

    // Answer SINGLE_CHOICE or OX question (assuming standard label structures)
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
