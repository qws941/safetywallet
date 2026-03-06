import { test, expect } from "@playwright/test";

test.describe("Admin Posts Management", () => {
  test("should display posts management heading", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "제보 관리" }),
    ).toBeVisible();
  });

  test("should display filter controls", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    // Category select
    await expect(page.getByText("카테고리 선택")).toBeVisible();
    // Risk level select
    await expect(page.getByText("위험도 선택")).toBeVisible();
    // Status select
    await expect(page.getByText("상태 선택")).toBeVisible();
  });

  test("should display urgent-only switch", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("긴급 제보만 보기")).toBeVisible();
    const urgentSwitch = page.getByRole("switch");
    await expect(urgentSwitch).toBeVisible();
  });

  test("should display date range inputs", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("시작일")).toBeVisible();
    await expect(page.getByText("종료일")).toBeVisible();
  });

  test("should have filter reset button", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const resetButton = page.getByRole("button", { name: "필터 초기화" });
    await expect(resetButton).toBeVisible();
  });

  test("should display searchable data table", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("제목, 작성자 검색...");
    await expect(searchInput).toBeVisible();
  });

  test("should allow typing in search field", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("제목, 작성자 검색...");
    await searchInput.fill("테스트");
    await expect(searchInput).toHaveValue("테스트");
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/posts");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
