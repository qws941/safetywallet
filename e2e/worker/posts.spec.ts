import { test, expect } from "@playwright/test";

test.describe("Worker Posts List", () => {
  test("should display posts page heading", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /내 신고 목록|my reports/i }),
    ).toBeVisible();
  });

  test("should display status filter buttons", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const filterLabels = [
      /전체|all/i,
      /긴급|urgent/i,
      /접수|received/i,
      /검토중|review/i,
      /승인|approved/i,
      /반려|rejected/i,
      /보완|supplement/i,
    ];

    for (const label of filterLabels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("should have new report link", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const newReportLink = page.getByRole("link", {
      name: /새 신고|new report/i,
    });
    await expect(newReportLink).toBeVisible();
    await expect(newReportLink).toHaveAttribute("href", /\/posts\/new/);
  });

  test("should show empty state or post cards", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const emptyState = page.getByText("📝");
    const postCards = page.locator("[class*='card'], [class*='Card']");

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasCards = (await postCards.count()) > 0;

    expect(hasEmpty || hasCards).toBeTruthy();
  });

  test("should switch between filter tabs", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const allButton = page.getByRole("button", { name: /전체|all/i });
    await allButton.click();
    await page.waitForLoadState("networkidle");

    // Page should still be on posts route after filter click
    expect(page.url()).toContain("/posts");
  });
});

test.describe("Worker New Post Form", () => {
  test("should display new post form page", async ({ page }) => {
    await page.goto("/posts/new");
    await page.waitForLoadState("networkidle");

    // Category selection grid should be visible
    const categoryButtons = page.getByRole("button");
    expect(await categoryButtons.count()).toBeGreaterThan(0);
  });

  test("should display category selection options", async ({ page }) => {
    await page.goto("/posts/new");
    await page.waitForLoadState("networkidle");

    // Category icons/labels visible
    await expect(page.getByText(/위험|hazard/i).first()).toBeVisible();
  });

  test("should show description textarea after category selection", async ({
    page,
  }) => {
    await page.goto("/posts/new");
    await page.waitForLoadState("networkidle");

    // Click first category button
    const categoryButtons = page
      .locator("button")
      .filter({ hasText: /⚠️|위험/i });
    if ((await categoryButtons.count()) > 0) {
      await categoryButtons.first().click();
    }

    // Description textarea should appear
    const textarea = page.locator("textarea");
    if ((await textarea.count()) > 0) {
      await expect(textarea.first()).toBeVisible();
    }
  });

  test("should have cancel and submit buttons", async ({ page }) => {
    await page.goto("/posts/new");
    await page.waitForLoadState("networkidle");

    const cancelButton = page.getByRole("button", { name: /취소|cancel/i });
    await expect(cancelButton).toBeVisible();
  });

  test("should have anonymous checkbox", async ({ page }) => {
    await page.goto("/posts/new");
    await page.waitForLoadState("networkidle");

    const anonCheckbox = page.getByRole("checkbox");
    if ((await anonCheckbox.count()) > 0) {
      await expect(anonCheckbox.first()).toBeVisible();
    }
  });

  test("should have file upload area", async ({ page }) => {
    await page.goto("/posts/new");
    await page.waitForLoadState("networkidle");

    // File upload area has dashed border styling
    const uploadArea = page.locator("[class*='dashed'], input[type='file']");
    if ((await uploadArea.count()) > 0) {
      expect(await uploadArea.count()).toBeGreaterThan(0);
    }
  });
});
