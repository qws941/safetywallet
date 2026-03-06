import { test, expect } from "@playwright/test";

test.describe("Admin Points Management", () => {
  test("should display points management heading", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "포인트 관리" }),
    ).toBeVisible();
  });

  test("should have settlement link", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    const settlementLink = page.getByRole("link", { name: /월말 정산/i });
    await expect(settlementLink).toBeVisible();
    await expect(settlementLink).toHaveAttribute(
      "href",
      /\/points\/settlement/,
    );
  });

  test("should have policies link", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    const policiesLink = page.getByRole("link", {
      name: /포인트 정책 관리/i,
    });
    await expect(policiesLink).toBeVisible();
    await expect(policiesLink).toHaveAttribute("href", /\/points\/policies/);
  });

  test("should display manual points award form", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /수동 포인트 지급/i }),
    ).toBeVisible();

    // Amount input
    const amountInput = page.getByPlaceholder("포인트");
    await expect(amountInput).toBeVisible();

    // Reason input
    const reasonInput = page.getByPlaceholder("지급 사유");
    await expect(reasonInput).toBeVisible();

    // Submit button
    const awardButton = page.getByRole("button", { name: "지급" });
    await expect(awardButton).toBeVisible();
  });

  test("should display searchable data table", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("회원, 사유 검색...");
    await expect(searchInput).toBeVisible();
  });

  test("should allow filling manual award form fields", async ({ page }) => {
    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    const amountInput = page.getByPlaceholder("포인트");
    const reasonInput = page.getByPlaceholder("지급 사유");

    await amountInput.fill("100");
    await reasonInput.fill("테스트 지급");

    await expect(amountInput).toHaveValue("100");
    await expect(reasonInput).toHaveValue("테스트 지급");
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/points");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
