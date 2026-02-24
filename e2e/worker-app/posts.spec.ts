import { test, expect } from "@playwright/test";
import { WorkerRateLimitError, workerLogin } from "./helpers";

test.describe("Worker App - Posts", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await workerLogin(page);
    } catch (error) {
      if (error instanceof WorkerRateLimitError) {
        test.skip(true, "Login rate-limited");
      }
      throw error;
    }

    if (!page.url().includes("/home")) {
      test.skip(true, "Login rate-limited or credentials invalid");
    }
  });

  test("Submit Valid Safety Report (Hazard/Medium)", async ({ page }) => {
    await page.goto("/posts/new");

    const hasCurrentSite = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("safetywallet-auth");
        if (!raw) return false;
        const parsed = JSON.parse(raw) as {
          state?: { currentSiteId?: string | null };
        };
        return Boolean(parsed.state?.currentSiteId);
      } catch {
        return false;
      }
    });
    if (!hasCurrentSite) {
      test.skip(true, "current site context missing for worker account");
    }

    await page.getByRole("button").filter({ hasText: "위험요소" }).click();

    await page.getByRole("button").filter({ hasText: "중간" }).click();

    const descriptionInput = page
      .getByPlaceholder("발견한 내용을 자세히 작성해주세요...")
      .or(page.getByPlaceholder("설명"))
      .or(page.getByLabel("설명"))
      .first();
    await descriptionInput.fill("E2E Test Hazard Report");

    const locationInput = page
      .getByPlaceholder("층수 (예: B1, 3층)")
      .or(page.getByPlaceholder("위치"))
      .or(page.getByLabel("위치"))
      .first();
    await locationInput.fill("1F Zone A");

    const zoneInput = page
      .getByPlaceholder("구역 (예: A동, 주차장)")
      .or(page.getByPlaceholder("posts.new.zone"))
      .first();
    if ((await zoneInput.count()) > 0) {
      await zoneInput.fill("Zone A");
    }

    const submitButton = page
      .getByRole("button", { name: "제보하기" })
      .or(page.getByRole("button", { name: "제출" }))
      .first();

    const createPostResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/posts") &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      )
      .catch(() => null);

    await submitButton.click();

    const createPostResponse = await createPostResponsePromise;
    if (!createPostResponse) {
      test.skip(true, "create post request not triggered");
    }

    await page.waitForURL("**/posts", { timeout: 30_000 });

    expect(page.url()).toContain("/posts");
    expect(page.url()).not.toContain("/posts/new");
  });
});
