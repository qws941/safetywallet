import { test, expect } from "@playwright/test";

test.describe("Admin Login", () => {
  test("should display login page with title", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "송도세브란스 관리자" }),
    ).toBeVisible();
  });

  test("should display username and password fields", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const usernameInput = page.locator("#admin-username");
    const passwordInput = page.locator("#admin-password");

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("should have login button disabled when fields are empty", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const loginButton = page.getByRole("button", { name: "로그인" });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeDisabled();
  });

  test("should enable login button when fields are filled", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.locator("#admin-username").fill("testuser");
    await page.locator("#admin-password").fill("testpass");

    const loginButton = page.getByRole("button", { name: "로그인" });
    await expect(loginButton).toBeEnabled();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
