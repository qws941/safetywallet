import { test, expect } from "@playwright/test";

test.describe("Admin Announcements", () => {
  test("should display announcements heading", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "공지사항" })).toBeVisible();
  });

  test("should have new announcement button", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: "새 공지 작성" });
    await expect(newButton).toBeVisible();
  });

  test("should show announcement form when create button clicked", async ({
    page,
  }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: "새 공지 작성" });
    await newButton.click();

    // Form elements should appear
    const titleInput = page.getByPlaceholder("제목");
    await expect(titleInput).toBeVisible();
  });

  test("should display form with pin and schedule options", async ({
    page,
  }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: "새 공지 작성" });
    await newButton.click();

    // Pin to top checkbox
    await expect(page.getByText("상단 고정")).toBeVisible();

    // Schedule publish
    await expect(page.getByText("예약 발행")).toBeVisible();
  });

  test("should have AI draft generation button in form", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: "새 공지 작성" });
    await newButton.click();

    const aiButton = page.getByRole("button", { name: /AI 초안 생성/i });
    await expect(aiButton).toBeVisible();
  });

  test("should show announcement cards or empty state", async ({ page }) => {
    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    const cards = page.locator("[class*='card'], [class*='Card']");
    const emptyState = page.getByText(/공지사항이 없습니다|no announcement/i);

    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/announcements");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
