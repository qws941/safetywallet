import { test, expect } from "@playwright/test";

test.describe("Admin Issues Management", () => {
  test("should display issues heading", async ({ page }) => {
    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "이슈 관리" }),
    ).toBeVisible();
  });

  test("should have create issue button", async ({ page }) => {
    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", { name: "이슈 등록" });
    await expect(createButton).toBeVisible();
  });

  test("should open create issue dialog", async ({ page }) => {
    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", { name: "이슈 등록" });
    await createButton.click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog title
    await expect(page.getByText("새 이슈 등록")).toBeVisible();

    // Title input
    const titleInput = page.locator("#title");
    await expect(titleInput).toBeVisible();

    // Assign codex checkbox
    const assignCheckbox = page.locator("#assignCodex");
    await expect(assignCheckbox).toBeVisible();

    // Submit button in dialog
    const submitButton = dialog.getByRole("button", { name: "이슈 등록" });
    await expect(submitButton).toBeVisible();
  });

  test("should have state filter select", async ({ page }) => {
    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    // State filter dropdown with options: 열린 이슈, 닫힌 이슈, 전체
    const stateFilter = page.getByText(/열린 이슈|닫힌 이슈|전체/i);
    await expect(stateFilter.first()).toBeVisible();
  });

  test("should show issue cards or empty state", async ({ page }) => {
    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    const emptyState = page.getByText(/이슈가 없습니다|no issue/i);

    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const isLoading = (await page.locator("[class*='skeleton']").count()) > 0;

    expect(hasCards || hasEmpty || isLoading).toBeTruthy();
  });

  test("should close create issue dialog on cancel", async ({ page }) => {
    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", { name: "이슈 등록" });
    await createButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Close via X or cancel
    const closeButton = dialog
      .locator("button[class*='close'], button:has(svg)")
      .first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await expect(dialog).not.toBeVisible();
    }
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/issues");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
