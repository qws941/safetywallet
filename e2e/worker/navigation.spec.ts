import { test, expect } from "@playwright/test";

test.describe("Worker navigation", () => {
  test("can navigate to posts page", async ({ page }) => {
    await page.goto("/posts");
    await expect(page).toHaveURL(/\/posts/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to education page", async ({ page }) => {
    await page.goto("/education");
    await expect(page).toHaveURL(/\/education/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to votes page", async ({ page }) => {
    await page.goto("/votes");
    await expect(page).toHaveURL(/\/votes/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to points page", async ({ page }) => {
    await page.goto("/points");
    await expect(page).toHaveURL(/\/points/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to profile page", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to announcements page", async ({ page }) => {
    await page.goto("/announcements");
    await expect(page).toHaveURL(/\/announcements/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to actions page", async ({ page }) => {
    await page.goto("/actions");
    await expect(page).toHaveURL(/\/actions/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to new post page", async ({ page }) => {
    await page.goto("/posts/new");
    await expect(page).toHaveURL(/\/posts\/new/);
  });

  test("bottom navigation links are present", async ({ page }) => {
    await page.goto("/home/");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    const links = nav.locator("a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("no console errors during navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/home/");
    await page.goto("/posts");
    await page.goto("/education");

    expect(errors).toHaveLength(0);
  });
});
