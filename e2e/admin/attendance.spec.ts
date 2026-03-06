import { test, expect } from "@playwright/test";

test.describe("Admin Attendance", () => {
  test("should display attendance heading", async ({ page }) => {
    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "출근 현황" }),
    ).toBeVisible();
  });

  test("should display attendance stats component", async ({ page }) => {
    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");

    // AttendanceStats renders cards/stats
    const statsArea = page.locator("[class*='card'], [class*='Card']");
    const loading = page.locator("[class*='skeleton'], [class*='Skeleton']");

    const hasStats = (await statsArea.count()) > 0;
    const isLoading = (await loading.count()) > 0;

    expect(hasStats || isLoading).toBeTruthy();
  });

  test("should have sync status link", async ({ page }) => {
    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");

    const syncLink = page.getByRole("link", { name: /연동 현황/i });
    await expect(syncLink).toBeVisible();
    await expect(syncLink).toHaveAttribute("href", /\/attendance\/sync/);
  });

  test("should display attendance records label", async ({ page }) => {
    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("출근 기록")).toBeVisible();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/attendance");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
