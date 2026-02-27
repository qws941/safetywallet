import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

test.describe("Admin App - YouTube Education Content", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education", { waitUntil: "networkidle" });

    const contentsTab = page.getByRole("tab", { name: "교육자료" });
    if (await contentsTab.isVisible()) {
      await contentsTab.click();
    }
  });

  test("can fetch YouTube info and create content", async ({ page }) => {
    await page.getByText("YouTube").click();

    const youtubeUrlInput = page.getByPlaceholder("YouTube URL");
    await youtubeUrlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    const fetchButton = page.getByRole("button", { name: "정보 가져오기" });
    await fetchButton.click();

    const titleInput = page.getByPlaceholder("제목");
    await expect(titleInput).not.toHaveValue("", { timeout: 10000 });

    const title = await titleInput.inputValue();
    expect(title.length).toBeGreaterThan(0);

    const contentUrlInput = page.getByPlaceholder("콘텐츠 URL");
    await expect(contentUrlInput).toHaveValue(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );

    const thumbnailUrlInput = page.getByPlaceholder("썸네일 URL");
    const thumbnailValue = await thumbnailUrlInput.inputValue();
    expect(thumbnailValue).toContain("img.youtube.com/vi/dQw4w9WgXcQ");

    const createButton = page.getByRole("button", { name: "교육자료 등록" });

    const createPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/contents") &&
        response.request().method() === "POST",
    );

    await createButton.click();

    const response = await createPromise;
    expect(response.status()).toBe(201);

    await expect(page.getByText("교육자료가 등록되었습니다.")).toBeVisible();

    const createdItemRow = page.getByRole("row").filter({ hasText: title });
    await expect(createdItemRow).toBeVisible();

    const deleteButton = createdItemRow
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .last();
    await deleteButton.click();

    const confirmButton = page.getByRole("button", {
      name: "삭제",
      exact: true,
    });
    await confirmButton.click();

    await expect(page.getByText("교육자료가 삭제되었습니다.")).toBeVisible();
  });
});
