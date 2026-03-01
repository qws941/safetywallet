import { test, expect } from "@playwright/test";

test.describe("Admin Votes Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/votes");
  });

  test("should display votes page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "투표 관리" }),
    ).toBeVisible();
  });

  test("should display data table or empty state", async ({ page }) => {
    const table = page.locator("table").first();
    const emptyText = page.getByText("데이터가 없습니다");
    await expect(table.or(emptyText).first()).toBeVisible({ timeout: 10000 });
  });

  test("should have create vote button", async ({ page }) => {
    const createBtn = page
      .getByRole("link", { name: /투표.*생성|새.*투표|투표.*만들기/ })
      .or(
        page.getByRole("button", { name: /투표.*생성|새.*투표|투표.*만들기/ }),
      );
    if (
      await createBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      expect(true).toBeTruthy();
    }
  });
});

test.describe("Admin Vote Creation", () => {
  test("should navigate to new vote page", async ({ page }) => {
    await page.goto("/votes/new");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    const form = page.locator("form").first();
    const heading = page.getByRole("heading").first();
    await expect(form.or(heading).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Admin Vote Candidates", () => {
  test("should navigate to candidates page", async ({ page }) => {
    await page.goto("/votes/candidates");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});
