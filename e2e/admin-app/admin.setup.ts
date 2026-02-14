import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/login");
    await page.getByPlaceholder("admin").fill("admin");
    await page.getByPlaceholder("••••••••").fill("admin123");
    await page.getByRole("button", { name: "로그인" }).click();

    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await page.context().storageState({ path: authFile });
      return;
    } catch {
      if (attempt < 2) {
        await page.waitForTimeout(15000);
      }
    }
  }
  throw new Error("Failed to authenticate as admin after 3 attempts");
});
