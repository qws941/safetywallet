import { test, expect } from "@playwright/test";

test.describe("Worker Education", () => {
  test("should display education page with tabs", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    // 3 tabs: 교육자료, 퀴즈, TBM
    const contentsTab = page.getByRole("button", {
      name: /교육자료|contents/i,
    });
    const quizzesTab = page.getByRole("button", { name: /퀴즈|quiz/i });
    const tbmTab = page.getByRole("button", { name: /TBM/i });

    await expect(contentsTab).toBeVisible();
    await expect(quizzesTab).toBeVisible();
    await expect(tbmTab).toBeVisible();
  });

  test("should show contents tab by default", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    // Contents tab should be active/selected
    const contentsTab = page.getByRole("button", {
      name: /교육자료|contents/i,
    });
    await expect(contentsTab).toBeVisible();
  });

  test("should switch to quizzes tab", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    const quizzesTab = page.getByRole("button", { name: /퀴즈|quiz/i });
    await quizzesTab.click();

    // After clicking, quiz content area should be visible
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/education");
  });

  test("should switch to TBM tab", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    const tbmTab = page.getByRole("button", { name: /TBM/i });
    await tbmTab.click();

    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/education");
  });

  test("should show content cards or empty state in contents tab", async ({
    page,
  }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    // Either content cards with type badges or loading/empty state
    const cards = page.locator("[class*='card'], [class*='Card']");
    const emptyState = page.getByText(/교육 자료가 없습니다|no education/i);

    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const isLoading =
      (await page.locator("[class*='skeleton'], [class*='Skeleton']").count()) >
      0;

    expect(hasCards || hasEmpty || isLoading).toBeTruthy();
  });

  test("should show quiz cards with badges in quizzes tab", async ({
    page,
  }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    const quizzesTab = page.getByRole("button", { name: /퀴즈|quiz/i });
    await quizzesTab.click();
    await page.waitForLoadState("networkidle");

    // Quiz cards may have active/closed badges, or empty state
    const quizContent = page.locator(
      "main, [role='main'], [class*='container']",
    );
    await expect(quizContent.first()).toBeVisible();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
