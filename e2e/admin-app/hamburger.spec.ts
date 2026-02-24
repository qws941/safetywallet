import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

test.describe("Admin App - Mobile Hamburger", () => {
  test("opens and closes mobile sidebar menu with hamburger button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/login")) {
      await adminLogin(page);
    }

    const menuButton = page.getByTestId("mobile-menu-toggle");
    await expect(menuButton).toBeVisible();

    await menuButton.click();

    const mobileDialog = page.locator('[role="dialog"]');
    await expect(mobileDialog).toBeVisible();
    await expect(mobileDialog).toContainText("메뉴");

    await page.keyboard.press("Escape");
    await expect(mobileDialog).toBeHidden();
  });
});
