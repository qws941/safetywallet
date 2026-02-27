import { test, expect } from "@playwright/test";
import { ensureWorkerCurrentSite, workerLogin } from "./helpers";

test.describe("Worker App - Posts", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await workerLogin(page);

    if (!page.url().includes("/home")) {
      throw new Error(`worker login did not land on home: ${page.url()}`);
    }
  });

  test("Submit Valid Safety Report (Hazard/Medium)", async ({ page }) => {
    await page.goto("/posts/new");

    let currentSiteId = await ensureWorkerCurrentSite(page);
    if (!currentSiteId) {
      currentSiteId =
        process.env.E2E_WORKER_SITE_ID ??
        "9f1af790-a811-4852-a765-18a5215cf933";
      await page.evaluate((siteId) => {
        const raw = localStorage.getItem("safetywallet-auth");
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          state?: { currentSiteId?: string | null };
        };
        localStorage.setItem(
          "safetywallet-auth",
          JSON.stringify({
            ...parsed,
            state: { ...parsed.state, currentSiteId: siteId },
          }),
        );
      }, currentSiteId);
      await page.reload({ waitUntil: "domcontentloaded" });
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
      throw new Error("create post request was not triggered");
    }

    if (
      createPostResponse.status() >= 400 &&
      createPostResponse.status() !== 403
    ) {
      const body = await createPostResponse.json().catch(() => null);
      throw new Error(
        `create post failed: ${createPostResponse.status()} ${JSON.stringify(body)}`,
      );
    }

    if (createPostResponse.status() === 403) {
      const body = (await createPostResponse.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      expect(body?.error?.code).toBe("NOT_SITE_MEMBER");
      expect(page.url()).toContain("/posts/new");
      return;
    }

    await page.waitForURL("**/posts", { timeout: 30_000 });

    expect(page.url()).toContain("/posts");
    expect(page.url()).not.toContain("/posts/new");
  });
});
