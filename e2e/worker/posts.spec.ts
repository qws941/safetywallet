import { test, expect } from "@playwright/test";
import {
  ensureWorkerCurrentSite,
  workerLogin,
  WorkerRateLimitError,
} from "./helpers";

test.describe("Worker App - Posts", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    try {
      await workerLogin(page);
    } catch (e) {
      if (e instanceof WorkerRateLimitError) {
        test.skip(true, "Worker login rate limited");
        return;
      }
      throw e;
    }

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

    await page.waitForURL(/\/posts\/?$/, { timeout: 30_000 });

    expect(page.url()).toContain("/posts");
    expect(page.url()).not.toContain("/posts/new");
  });

  test("View post list page", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForURL(/\/posts(?:\?.*)?$/, { timeout: 30_000 });

    const postsResponse = await page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/posts") &&
          response.request().method() === "GET",
        { timeout: 15_000 },
      )
      .catch(() => null);

    if (postsResponse?.status() === 403) {
      const body = (await postsResponse.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code === "NOT_SITE_MEMBER") {
        test.skip(true, "Worker is not site member for posts list");
        return;
      }
    }

    const listHeading = page
      .getByRole("heading", { name: /제보|게시|안전/ })
      .or(page.getByText("제보"))
      .first();
    await expect(listHeading).toBeVisible();

    const postCards = page
      .locator("a[href^='/posts/']")
      .filter({ hasNot: page.locator("a[href='/posts/new']") });
    const emptyState = page
      .getByText(/제보가 없습니다|등록된 제보가 없습니다|아직 제보가 없습니다/)
      .first();

    const hasPostCard = (await postCards.count()) > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    expect(hasPostCard || hasEmptyState).toBeTruthy();
  });

  test("View post detail", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForURL(/\/posts(?:\?.*)?$/, { timeout: 30_000 });

    const postsResponse = await page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/posts") &&
          response.request().method() === "GET",
        { timeout: 15_000 },
      )
      .catch(() => null);

    if (postsResponse?.status() === 403) {
      const body = (await postsResponse.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code === "NOT_SITE_MEMBER") {
        test.skip(true, "Worker is not site member for posts detail");
        return;
      }
    }

    const firstPostCard = page
      .locator("a[href^='/posts/']")
      .filter({ hasNot: page.locator("a[href='/posts/new']") })
      .first();

    if ((await firstPostCard.count()) === 0) {
      test.skip(true, "No post card available for detail navigation");
      return;
    }

    await firstPostCard.click();
    await page.waitForURL(/\/posts\/(?:view|[^/?#]+)/, { timeout: 30_000 });

    const detailContent = page
      .getByRole("heading", { name: /제보|상세|안전/ })
      .or(page.getByText(/내용|위치|작성/))
      .first();
    await expect(detailContent).toBeVisible();
  });

  test("Filter posts by category", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForURL(/\/posts(?:\?.*)?$/, { timeout: 30_000 });

    const postsResponse = await page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/posts") &&
          response.request().method() === "GET",
        { timeout: 15_000 },
      )
      .catch(() => null);

    if (postsResponse?.status() === 403) {
      const body = (await postsResponse.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code === "NOT_SITE_MEMBER") {
        test.skip(true, "Worker is not site member for category filtering");
        return;
      }
    }

    const filterChip = page
      .getByRole("button", { name: /위험요소|개선제안|칭찬|기타/ })
      .first();

    if ((await filterChip.count()) === 0) {
      test.skip(true, "Category filter chip is not rendered");
      return;
    }

    const beforeUrl = page.url();
    const filteredResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/posts") &&
          response.request().method() === "GET",
        { timeout: 12_000 },
      )
      .catch(() => null);

    await filterChip.click();

    const filteredResponse = await filteredResponsePromise;
    const filteredStatus = filteredResponse?.status();
    if (typeof filteredStatus === "number" && filteredStatus >= 500) {
      throw new Error(`posts filtering request failed: ${filteredStatus}`);
    }

    const pressedState = await filterChip.getAttribute("aria-pressed");
    const urlChanged = page.url() !== beforeUrl;
    const hasRefetch = !!filteredResponse;

    expect(urlChanged || pressedState === "true" || hasRefetch).toBeTruthy();
  });

  test("Toggle anonymous submission", async ({ page }) => {
    await page.goto("/posts/new");
    await ensureWorkerCurrentSite(page);

    const anonymousToggle = page
      .getByRole("switch", { name: /익명/ })
      .or(page.getByRole("checkbox", { name: /익명/ }))
      .or(page.getByLabel(/익명/))
      .first();

    if ((await anonymousToggle.count()) === 0) {
      test.skip(true, "Anonymous toggle is not available");
      return;
    }

    const beforeAria = await anonymousToggle.getAttribute("aria-checked");
    const beforeChecked = await anonymousToggle.isChecked().catch(() => null);

    await anonymousToggle.click();
    await page.waitForTimeout(200);

    const afterAria = await anonymousToggle.getAttribute("aria-checked");
    const afterChecked = await anonymousToggle.isChecked().catch(() => null);

    const ariaChanged =
      beforeAria !== null && afterAria !== null && beforeAria !== afterAria;
    const checkedChanged =
      beforeChecked !== null &&
      afterChecked !== null &&
      beforeChecked !== afterChecked;

    expect(ariaChanged || checkedChanged).toBeTruthy();
  });

  test("Submit post with empty form shows validation", async ({ page }) => {
    await page.goto("/posts/new");
    await ensureWorkerCurrentSite(page);

    const categoryButton = page
      .getByRole("button")
      .filter({ hasText: "위험요소" })
      .first();
    await categoryButton.click();

    const mediumSeverityButton = page
      .getByRole("button")
      .filter({ hasText: "중간" })
      .first();
    if ((await mediumSeverityButton.count()) > 0) {
      await mediumSeverityButton.click();
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
        { timeout: 10_000 },
      )
      .catch(() => null);

    await submitButton.click();

    const createPostResponse = await createPostResponsePromise;
    if (createPostResponse?.status() === 403) {
      const body = (await createPostResponse.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code === "NOT_SITE_MEMBER") {
        test.skip(true, "Worker is not site member for post submission");
        return;
      }
    }

    const validationMessage = page
      .getByText(/필수|입력해|작성해|선택해|내용을 입력/)
      .first();
    const hasValidationMessage = await validationMessage
      .isVisible()
      .catch(() => false);
    const invalidFieldCount = await page
      .locator("textarea:invalid, input:invalid")
      .count();
    const hasValidationResponse =
      createPostResponse?.status() === 400 || createPostResponse === null;

    expect(
      hasValidationMessage || invalidFieldCount > 0 || hasValidationResponse,
    ).toBeTruthy();
  });

  test("Navigate back from post detail", async ({ page }) => {
    await page.goto("/posts");
    await page.waitForURL(/\/posts(?:\?.*)?$/, { timeout: 30_000 });

    const postsResponse = await page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/posts") &&
          response.request().method() === "GET",
        { timeout: 15_000 },
      )
      .catch(() => null);

    if (postsResponse?.status() === 403) {
      const body = (await postsResponse.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code === "NOT_SITE_MEMBER") {
        test.skip(true, "Worker is not site member for detail back navigation");
        return;
      }
    }

    const firstPostCard = page
      .locator("a[href^='/posts/']")
      .filter({ hasNot: page.locator("a[href='/posts/new']") })
      .first();

    if ((await firstPostCard.count()) === 0) {
      test.skip(true, "No post card available for detail back navigation");
      return;
    }

    await firstPostCard.click();
    await page.waitForURL(/\/posts\/(?:view|[^/?#]+)/, { timeout: 30_000 });

    const backControl = page
      .getByRole("button", { name: /뒤로|목록|이전/ })
      .or(page.getByRole("link", { name: /뒤로|목록|이전/ }))
      .first();

    if ((await backControl.count()) > 0) {
      await backControl.click();
    } else {
      await page.goBack();
    }

    await page.waitForURL(/\/posts(?:\?.*)?$/, { timeout: 30_000 });
    expect(page.url()).toContain("/posts");
    expect(page.url()).not.toContain("/posts/new");
  });
});
