import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard Recommendations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/recommendations");
  });

  test("should display recommendations stats title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "추천 통계" }),
    ).toBeVisible();
  });

  test("should display stats cards or empty state", async ({ page }) => {
    const card = page.locator(".rounded-lg.border, [class*='card']").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(card.or(emptyText)).toBeVisible({ timeout: 10000 });
  });

  test("should display charts or data visualization", async ({ page }) => {
    const chart = page.locator(
      "canvas, svg, [class*='chart'], [data-testid*='chart'], [class*='recharts']",
    );
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(chart.first().or(table).or(emptyText)).toBeVisible({
      timeout: 10000,
    });
  });
});
