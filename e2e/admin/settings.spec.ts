import { test, expect } from "@playwright/test";

test.describe("Admin Settings", () => {
  test("should display settings heading", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();
  });

  test("should display save button (disabled by default)", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const saveButton = page.getByRole("button", { name: "저장" });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();
  });

  test("should display site info card", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "현장 정보" }),
    ).toBeVisible();
  });

  test("should display site name input", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const siteNameInput = page.getByPlaceholder("현장 이름을 입력하세요");
    await expect(siteNameInput).toBeVisible();
  });

  test("should display site active checkbox", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const activeCheckbox = page.locator("#active");
    await expect(activeCheckbox).toBeVisible();

    await expect(page.getByText("현장 활성화")).toBeVisible();
  });

  test("should enable save button when form is dirty", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const siteNameInput = page.getByPlaceholder("현장 이름을 입력하세요");
    const saveButton = page.getByRole("button", { name: "저장" });

    // Initially disabled
    await expect(saveButton).toBeDisabled();

    // Type something to make form dirty
    await siteNameInput.fill("테스트 현장");

    // Save button should now be enabled
    await expect(saveButton).toBeEnabled();
  });

  test("should not produce console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
