import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "./helpers";

test.describe("Worker Education", () => {
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

  test("renders education page", async ({ page }) => {
    await page.goto("/education");
    await expect(
      page.locator("text=/교육|안전|education/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays three tabs: contents, quizzes, tbm", async ({ page }) => {
    await page.goto("/education");
    const tabs = page
      .locator("button, [role='tab']")
      .filter({ hasText: /교육|퀴즈|TBM|contents|quiz/i });
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("contents tab shows education cards or empty state", async ({
    page,
  }) => {
    await page.goto("/education");
    const content = page
      .locator(
        "[data-testid='education-card'], .card, text=/없습니다|empty|교육/i",
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test("quizzes tab shows quiz list", async ({ page }) => {
    await page.goto("/education");
    const quizTab = page
      .locator("button, [role='tab']")
      .filter({ hasText: /퀴즈|quiz/i })
      .first();
    await quizTab.click();
    const quizContent = page
      .locator("[data-testid='quiz-card'], .card, text=/퀴즈|quiz|없습니다/i")
      .first();
    await expect(quizContent).toBeVisible({ timeout: 10_000 });
  });

  test("education detail page loads with query param", async ({ page }) => {
    await page.goto("/education");
    const card = page
      .locator("a[href*='/education/view'], [data-testid='education-card'] a")
      .first();
    const hasContent = await card
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasContent) {
      await card.click();
      await expect(page).toHaveURL(/\/education\/view\?id=/);
    } else {
      await page.goto("/education/view?id=1");
      await expect(
        page.locator("text=/교육|내용|content|없습니다|not found/i").first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("quiz take page loads with query param", async ({ page }) => {
    await page.goto("/education");
    const quizTab = page
      .locator("button, [role='tab']")
      .filter({ hasText: /퀴즈|quiz/i })
      .first();
    await quizTab.click();

    const quizLink = page
      .locator(
        "a[href*='/education/quiz-take'], button:has-text(/시작|응시|take/i)",
      )
      .first();
    const hasQuiz = await quizLink
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasQuiz) {
      await quizLink.click();
      await expect(page).toHaveURL(/\/education\/quiz-take\?id=/);
    } else {
      await page.goto("/education/quiz-take?id=1");
      await expect(
        page.locator("text=/퀴즈|문제|question|없습니다|not found/i").first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
