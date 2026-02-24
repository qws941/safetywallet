import { test, expect } from "@playwright/test";

test.describe("Worker App - Register Page @smoke", () => {
  test("login page hides register link", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: "회원가입" })).toHaveCount(0);
  });
});
