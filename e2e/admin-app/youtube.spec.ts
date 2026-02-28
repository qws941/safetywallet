import { test, expect, Page } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * Recover from Next.js error boundary ("Something went wrong").
 * Clicks "Try again" then full-reloads if needed. Throws on persistent failure.
 */
async function recoverFromErrorBoundary(
  page: Page,
  maxAttempts = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const hasError = await page
      .getByText("Something went wrong")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (!hasError) return;

    const tryAgainButton = page.getByRole("button", { name: "Try again" });
    const canRetry = await tryAgainButton
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    if (canRetry) {
      await tryAgainButton.click();
      await page.waitForTimeout(2_000);
    } else {
      await page.goto("/education", { waitUntil: "networkidle" });
    }
  }

  const stillBroken = await page
    .getByText("Something went wrong")
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (stillBroken) {
    throw new Error(
      `Education page error boundary persists after ${maxAttempts} recovery attempts`,
    );
  }
}

/** Fill a controlled React input and verify the value persisted after re-render. */
async function fillAndVerify(
  page: Page,
  placeholder: string,
  value: string,
): Promise<void> {
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  await input.fill(value);
  await expect(input).toHaveValue(value, { timeout: 5_000 });
}

test.describe("Admin App - YouTube Education Content", () => {
  // Page load recovery (6s) + form fill + CRUD operations + cleanup
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education", { waitUntil: "networkidle" });
    await recoverFromErrorBoundary(page);
  });

  test("can fetch YouTube info and create content", async ({ page }) => {
    const contentsTab = page.getByRole("tab", { name: "교육자료" });
    if (await contentsTab.isVisible().catch(() => false)) {
      await contentsTab.click();
      await page.waitForTimeout(500);
    }
    await recoverFromErrorBoundary(page);

    const testTitle = `E2E YouTube Test ${Date.now()}`;
    const youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const thumbnailUrl = "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg";

    await fillAndVerify(page, "제목", testTitle);
    await fillAndVerify(page, "콘텐츠 URL", youtubeUrl);
    await fillAndVerify(page, "썸네일 URL", thumbnailUrl);

    const createButton = page.getByRole("button", { name: "교육자료 등록" });
    await expect(createButton).toBeEnabled({ timeout: 5_000 });

    const createPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/education/contents") &&
        response.request().method() === "POST",
    );

    await createButton.click();

    const response = await createPromise;
    expect(response.status()).toBe(201);

    await expect(
      page.getByText("교육자료가 등록되었습니다.").first(),
    ).toBeVisible();

    const createdItemRow = page
      .getByRole("row")
      .filter({ hasText: testTitle })
      .first();
    await expect(createdItemRow).toBeVisible();

    const deleteButton = createdItemRow
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .last();
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    const deleteConfirm = dialog.getByRole("button", { name: "삭제" });
    await deleteConfirm.scrollIntoViewIfNeeded();
    await deleteConfirm.evaluate((el: HTMLElement) => el.click());

    await expect(
      page.getByText("교육자료가 삭제되었습니다.").first(),
    ).toBeVisible();
  });
});
