import { test, expect } from "@playwright/test";

test.describe("Worker Login", () => {
  test("should display login form with required fields", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator("#name");
    const phoneInput = page.locator("#phone");
    const dobInput = page.locator("#dob");

    await expect(nameInput).toBeVisible();
    await expect(phoneInput).toBeVisible();
    await expect(dobInput).toBeVisible();
  });

  test("should have a login button", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const loginButton = page.getByRole("button", { name: /로그인|sign in/i });
    await expect(loginButton).toBeVisible();
  });

  test("should allow filling in login fields", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.locator("#name").fill("테스트");
    await page.locator("#phone").fill("01012345678");
    await page.locator("#dob").fill("1990-01-01");

    await expect(page.locator("#name")).toHaveValue("테스트");
    await expect(page.locator("#phone")).toHaveValue("01012345678");
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
