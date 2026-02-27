import { test, expect } from "@playwright/test";
import { workerLogin } from "../shared/helpers";

test.describe("Education YouTube Fallback", () => {
  test("should render YouTube iframe when contentUrl is null but sourceUrl is present", async ({
    page,
  }) => {
    // 1. Authenticate as worker
    await workerLogin(page);

    const mockId = "mock-youtube-id";
    const mockYouTubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    // 2. Intercept API to return mocked data with the exact bug condition
    await page.route(`**/api/education/contents/${mockId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          data: {
            id: mockId,
            siteId: "test-site-id",
            title: "Test YouTube Fallback Video",
            description: "Testing fallback logic",
            contentType: "VIDEO",
            category: "SAFETY",
            isRequired: false,
            contentUrl: null, // BUG CONDITION: contentUrl is null
            sourceUrl: mockYouTubeUrl, // BUG CONDITION: sourceUrl has the YT link
            thumbnailUrl: null,
            durationMinutes: 5,
            externalSource: "YOUTUBE",
            externalId: "dQw4w9WgXcQ",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // 3. Navigate to the education view page
    await page.goto(`/education/view?id=${mockId}`);

    // 4. Verify page loaded
    await expect(
      page.locator("text=Test YouTube Fallback Video"),
    ).toBeVisible();

    // 5. Verify iframe renders with correct embed URL
    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Verify src contains the embed URL
    const src = await iframe.getAttribute("src");
    expect(src).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });
});
