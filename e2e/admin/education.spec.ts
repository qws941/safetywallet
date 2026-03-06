import { test, expect } from "@playwright/test";

test.describe("Admin Education Management", () => {
  test("should display education management heading", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "교육 관리" }),
    ).toBeVisible();
  });

  test("should display four tab buttons", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    // 4 tabs: contents, quizzes, statutory, tbm
    const tabButtons = page.getByRole("button");
    expect(await tabButtons.count()).toBeGreaterThanOrEqual(4);
  });

  test("should switch between tabs", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    const buttons = page.getByRole("button");
    const count = await buttons.count();

    // Click each tab and verify page stays on education
    for (let i = 0; i < Math.min(count, 4); i++) {
      await buttons.nth(i).click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/education");
    }
  });

  test("should show tab content area", async ({ page }) => {
    await page.goto("/education");
    await page.waitForLoadState("networkidle");

    // Tab content should be rendered
    const content = page.locator("main, [class*='container']");
    await expect(content.first()).toBeVisible();
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
