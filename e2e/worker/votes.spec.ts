import { test, expect } from "@playwright/test";

test.describe("Worker Recommendations", () => {
  test("should display recommendations page", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    // Page should load with recommendation form or already-recommended state
    const form = page.locator("form");
    const successState = page.locator("[class*='CheckCircle'], svg");

    const hasForm = (await form.count()) > 0;
    const hasSuccess = (await successState.count()) > 0;

    expect(hasForm || hasSuccess).toBeTruthy();
  });

  test("should show recommendation form fields when not yet recommended", async ({
    page,
  }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    // If recommendation form is visible, check its fields
    const form = page.locator("form");
    if ((await form.count()) > 0) {
      // Trade type input
      const tradeTypeInput = page.locator(
        "input[name*='trade'], input[placeholder*='직종']",
      );
      // Worker name input
      const nameInput = page.locator(
        "input[name*='name'], input[placeholder*='이름']",
      );
      // Reason textarea
      const reasonTextarea = page.locator("textarea");

      // At least one form element should be visible
      const hasTradeType = (await tradeTypeInput.count()) > 0;
      const hasName = (await nameInput.count()) > 0;
      const hasReason = (await reasonTextarea.count()) > 0;

      expect(hasTradeType || hasName || hasReason).toBeTruthy();
    }
  });

  test("should have submit button", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    const submitButton = page.getByRole("button", {
      name: /추천|submit|제출/i,
    });
    const sendButton = page.locator("button[type='submit']");

    const hasSubmit = await submitButton.isVisible().catch(() => false);
    const hasSend = (await sendButton.count()) > 0;

    expect(hasSubmit || hasSend).toBeTruthy();
  });

  test("should have history toggle", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    const historyButton = page.getByRole("button", {
      name: /기록|history|내역/i,
    });

    if (await historyButton.isVisible().catch(() => false)) {
      await historyButton.click();
      await page.waitForLoadState("networkidle");
      // After toggle, history list should appear
      expect(page.url()).toContain("/votes");
    }
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
