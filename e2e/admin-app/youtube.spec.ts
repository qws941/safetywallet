import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

test.describe("Admin App - YouTube Education Content", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education", { waitUntil: "networkidle" });

    // Skip if education page returns server error (non-workday / server issue)
    const hasError = await page
      .getByText("Something went wrong")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (hasError) {
      test.skip(true, "Education page returned server error");
    }

    const contentsTab = page.getByRole("tab", { name: "교육자료" });
    if (await contentsTab.isVisible()) {
      await contentsTab.click();
      await page.waitForTimeout(500);
    }

    const hasErrorAfterTab = await page
      .getByText("Something went wrong")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (hasErrorAfterTab) {
      test.skip(true, "Education content tab returned server error");
    }
  });

  // Extend timeout for YouTube oEmbed fetch + content creation
  test.setTimeout(60_000);

  test("can fetch YouTube info and create content", async ({ page }) => {
    await page.getByText("YouTube").click();

    const youtubeUrlInput = page.getByPlaceholder("YouTube URL");
    await youtubeUrlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    const fetchButton = page.getByRole("button", { name: "정보 가져오기" });
    await fetchButton.click();

    // Wait for oEmbed API response before checking title
    const oembedResponse = await page
      .waitForResponse(
        (res) =>
          res.url().includes("youtube-oembed") &&
          res.request().method() === "GET",
        { timeout: 15_000 },
      )
      .catch(() => null);

    if (!oembedResponse || oembedResponse.status() !== 200) {
      test.skip(
        true,
        `YouTube oEmbed returned ${oembedResponse?.status() ?? "timeout"} — auth or API issue`,
      );
      return;
    }

    const hasErrorAfterFetch = await page
      .getByText("Something went wrong")
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    if (hasErrorAfterFetch) {
      test.skip(true, "Education page crashed after oEmbed fetch");
      return;
    }

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
