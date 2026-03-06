import { test, expect } from "@playwright/test";

test.describe("Admin Members Management", () => {
  test("should display members management heading", async ({ page }) => {
    await page.goto("/members");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "회원 관리" }),
    ).toBeVisible();
  });

  test("should display searchable data table", async ({ page }) => {
    await page.goto("/members");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("이름 검색...");
    await expect(searchInput).toBeVisible();
  });

  test("should allow typing in search field", async ({ page }) => {
    await page.goto("/members");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("이름 검색...");
    await searchInput.fill("홍길동");
    await expect(searchInput).toHaveValue("홍길동");
  });

  test("should display member table or loading state", async ({ page }) => {
    await page.goto("/members");
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

    await page.goto("/members");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
