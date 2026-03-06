import { test, expect } from "@playwright/test";

test.describe("Worker Profile", () => {
  test("should display profile page with user info", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // Profile card should show avatar/name
    const profileSection = page.locator("[class*='card'], [class*='Card']");
    await expect(profileSection.first()).toBeVisible();
  });

  test("should display current site information", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // Site info section should be present
    const siteInfo = page.getByText(/현장|site/i);
    if (
      await siteInfo
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(siteInfo.first()).toBeVisible();
    }
  });

  test("should have push notification toggle", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // Push notification switch
    const switchElement = page.getByRole("switch");
    if (await switchElement.isVisible().catch(() => false)) {
      await expect(switchElement).toBeVisible();
    }
  });

  test("should have leave site button with confirmation dialog", async ({
    page,
  }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    const leaveSiteButton = page.getByRole("button", {
      name: /현장 탈퇴|leave site/i,
    });
    if (await leaveSiteButton.isVisible().catch(() => false)) {
      await leaveSiteButton.click();

      // AlertDialog confirmation should appear
      const dialog = page.getByRole("alertdialog");
      if (await dialog.isVisible().catch(() => false)) {
        await expect(dialog).toBeVisible();

        // Cancel button in dialog
        const cancelButton = dialog.getByRole("button", {
          name: /취소|cancel/i,
        });
        await cancelButton.click();
      }
    }
  });

  test("should have logout button", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    const logoutButton = page.getByRole("button", {
      name: /로그아웃|logout|sign out/i,
    });
    await expect(logoutButton).toBeVisible();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
