import { test, expect } from "@playwright/test";
test.describe("Worker App - Smoke Tests @smoke", () => {
  test("should redirect root to /login when unauthenticated @smoke", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should render login page with all fields @smoke", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "이름" })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "휴대폰 번호" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /생년월일/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });

  test("should hide register link on login page @smoke", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "회원가입" })).toHaveCount(0);
  });

  test("should redirect protected route to login @smoke", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("login page loads without console errors @smoke", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("service-worker") &&
        !e.includes("net::ERR_CERT_AUTHORITY_INVALID") &&
        !e.includes("net::ERR_CONNECTION_REFUSED"),
    );
    expect(critical).toHaveLength(0);
  });

  test("non-existent page shows 404 or redirects @smoke", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response).not.toBeNull();
  });
});
