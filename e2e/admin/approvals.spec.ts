import { test, expect } from "@playwright/test";

test.describe("Admin Approvals", () => {
  test("should display approvals heading", async ({ page }) => {
    await page.goto("/approvals");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "승인 관리" }),
    ).toBeVisible();
  });

  test("should have manual approval creation button", async ({ page }) => {
    await page.goto("/approvals");
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", { name: "수동 승인 생성" });
    await expect(createButton).toBeVisible();
  });

  test("should display pending and history tabs", async ({ page }) => {
    await page.goto("/approvals");
    await page.waitForLoadState("networkidle");

    const pendingTab = page.getByRole("button", { name: "대기 중" });
    const historyTab = page.getByRole("button", { name: "처리 내역" });

    await expect(pendingTab).toBeVisible();
    await expect(historyTab).toBeVisible();
  });

  test("should switch between pending and history tabs", async ({ page }) => {
    await page.goto("/approvals");
    await page.waitForLoadState("networkidle");

    const historyTab = page.getByRole("button", { name: "처리 내역" });
    await historyTab.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/approvals");

    const pendingTab = page.getByRole("button", { name: "대기 중" });
    await pendingTab.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/approvals");
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/approvals");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
