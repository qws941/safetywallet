import { test, expect } from "@playwright/test";

test.describe("Admin navigation", () => {
  test("can navigate to posts page", async ({ page }) => {
    await page.goto("/posts");
    await expect(page).toHaveURL(/\/posts/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to members page", async ({ page }) => {
    await page.goto("/members");
    await expect(page).toHaveURL(/\/members/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to attendance page", async ({ page }) => {
    await page.goto("/attendance");
    await expect(page).toHaveURL(/\/attendance/);
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

  test("can navigate to announcements page", async ({ page }) => {
    await page.goto("/announcements");
    await expect(page).toHaveURL(/\/announcements/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to approvals page", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page).toHaveURL(/\/approvals/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("can navigate to monitoring page", async ({ page }) => {
    await page.goto("/monitoring");
    await expect(page).toHaveURL(/\/monitoring/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("sidebar navigation links are present", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    const links = nav.locator("a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("no console errors during navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/dashboard");
    await page.goto("/posts");
    await page.goto("/members");

    expect(errors).toHaveLength(0);
  });
});
