import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Admin Smoke Tests", () => {
  test("should redirect root to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should render login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("안전지갑 관리자")).toBeVisible();
    await expect(page.getByPlaceholder("admin")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("admin").fill("invalid");
    await page.getByPlaceholder("••••••••").fill("invalid");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.locator(".text-destructive")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should redirect dashboard to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
