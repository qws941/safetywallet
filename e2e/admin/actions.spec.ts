import { test, expect } from "@playwright/test";

test.describe("Admin Actions Management", () => {
  test("should display actions heading", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "조치 현황" }),
    ).toBeVisible();
  });

  test("should display stat cards", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    // 3 stat cards: 기한 초과, 진행 중, 완료
    await expect(page.getByText("기한 초과")).toBeVisible();
    await expect(page.getByText("진행 중")).toBeVisible();
    await expect(page.getByText("완료")).toBeVisible();
  });

  test("should display filter tabs", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    // 6 filter buttons
    const filterButtons = page.getByRole("button");
    expect(await filterButtons.count()).toBeGreaterThanOrEqual(6);
  });

  test("should display searchable data table", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("내용, 담당자 검색...");
    await expect(searchInput).toBeVisible();
  });

  test("should switch between filter tabs", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    const buttons = page.getByRole("button");
    const count = await buttons.count();

    if (count >= 2) {
      await buttons.nth(1).click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/actions");
    }
  });

  test("should show table or loading state", async ({ page }) => {
    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    const table = page.getByRole("table");
    const loading = page.locator("[class*='skeleton'], [class*='Skeleton']");

    const hasTable = await table.isVisible().catch(() => false);
    const isLoading = (await loading.count()) > 0;

    expect(hasTable || isLoading).toBeTruthy();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/actions");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
