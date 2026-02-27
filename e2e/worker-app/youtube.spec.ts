import { test, expect } from "@playwright/test";
import { workerLogin } from "./helpers";

test.describe("Worker App - Education YouTube", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await workerLogin(page);
    await page.goto("/education", { waitUntil: "networkidle" });
  });

  test("can view a YouTube education content and iframe has correct attributes", async ({
    page,
  }) => {
    const MOCK_YOUTUBE_CONTENT = {
      id: "test-yt-123",
      siteId: "test-site",
      title: "E2E YouTube Test Video",
      description: "Testing YouTube Error 153 fix",
      contentType: "VIDEO",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      durationMinutes: 3,
      isRequired: false,
      externalSource: "YOUTUBE",
      externalId: "dQw4w9WgXcQ",
      createdAt: new Date().toISOString(),
    };

    await page.route("**/api/education/contents/test-yt-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_YOUTUBE_CONTENT,
        }),
      });
    });

    await page.goto("/education/view?id=test-yt-123", {
      waitUntil: "networkidle",
    });

    await expect(
      page.locator("h1").filter({ hasText: "E2E YouTube Test Video" }),
    ).toBeVisible();

    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible();

    const src = await iframe.getAttribute("src");
    expect(src).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");

    expect(src).toContain("origin=");

    const policy = await iframe.getAttribute("referrerpolicy");
    expect(policy).toBe("strict-origin-when-cross-origin");

    const externalLink = page.getByRole("link", { name: "YouTube에서 보기" });
    await expect(externalLink).toBeVisible();
    await expect(externalLink).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });
});
