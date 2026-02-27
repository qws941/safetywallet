import { test, expect } from "@playwright/test";
import { workerLogin } from "./helpers";

test.describe("Education View Debug", () => {
  test("dumps state to find why iframe is missing", async ({ page }) => {
    // Capture console logs
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

    // Log network requests to see if mock works
    page.on("request", (req) => {
      if (req.url().includes("education/contents"))
        console.log("REQ:", req.url());
    });
    page.on("response", async (res) => {
      if (res.url().includes("education/contents")) {
        console.log(
          "RES:",
          res.status(),
          await res.text().catch(() => "failed to read body"),
        );
      }
    });

    await workerLogin(page);

    const mockId = "mock-youtube-id";
    const mockYouTubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    // Intercept the API call to return mock data
    await page.route(`**/api/education/contents/${mockId}`, async (route) => {
      console.log("ROUTE INTERCEPTED!");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          data: {
            id: mockId,
            siteId: "test-site",
            title: "Test YouTube Fallback Video",
            description: "Testing fallback logic",
            contentType: "VIDEO",
            contentUrl: null,
            sourceUrl: mockYouTubeUrl,
            contentBody: null,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`/education/view?id=${mockId}`);
    await page.waitForLoadState("networkidle");

    // Wait a bit to ensure React Query finishes
    await page.waitForTimeout(2000);

    const html = await page.content();
    console.log(
      "HTML DUMP (iframe part):",
      html.match(/<main.*?<\/main>/s)?.[0] || "main not found",
    );

    // Let's assert something so test passes if UI rendered correctly
    await expect(
      page.locator("text=Test YouTube Fallback Video"),
    ).toBeVisible();
  });
});
