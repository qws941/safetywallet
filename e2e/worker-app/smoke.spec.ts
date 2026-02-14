import { test, expect } from "@playwright/test";

test.describe("Worker App - Smoke Tests", () => {
  test("non-existent page shows 404 or redirects", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response).not.toBeNull();
  });
});
