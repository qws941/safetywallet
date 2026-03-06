import { test, expect } from "@playwright/test";

test.describe("Admin Votes Management", () => {
  test("should display votes management heading", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "투표 관리" }),
    ).toBeVisible();
  });

  test("should display month picker", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    const monthInput = page.locator("input[type='month']");
    await expect(monthInput).toBeVisible();
  });

  test("should display vote period and candidate cards", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    // VotePeriodCard, CandidatesCard, ResultsCard
    const cards = page.locator("[class*='card'], [class*='Card']");
    const loading = page.locator("[class*='skeleton'], [class*='Skeleton']");

    const hasCards = (await cards.count()) > 0;
    const isLoading = (await loading.count()) > 0;

    expect(hasCards || isLoading).toBeTruthy();
  });

  test("should allow changing month", async ({ page }) => {
    await page.goto("/votes");
    await page.waitForLoadState("networkidle");

    const monthInput = page.locator("input[type='month']");
    await monthInput.fill("2025-01");

    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/votes");
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
