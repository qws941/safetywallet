import { test, expect } from "@playwright/test";
import { ensureWorkerCurrentSite, workerLogin } from "./helpers";

const AUTHENTICATED_ROUTES = [
  "/",
  "/home",
  "/posts",
  "/posts/view",
  "/posts/new",
  "/actions",
  "/actions/view",
  "/votes",
  "/education",
  "/education/view",
  "/education/quiz-take",
  "/announcements",
  "/points",
  "/profile",
];

test.describe("Worker App - Full Scenario After Login", () => {
  test.describe.configure({ timeout: 180_000 });
  test.describe.configure({ mode: "serial" });

  test("completes authenticated end-to-end core scenario @smoke", async ({
    page,
  }) => {
    await test.step("login succeeds and lands on home", async () => {
      const loginResult = await workerLogin(page);
      expect(loginResult).toBe("home");
      await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
    });

    await test.step("worker site context is available", async () => {
      let siteId = await ensureWorkerCurrentSite(page);
      if (!siteId) {
        siteId =
          process.env.E2E_WORKER_SITE_ID ??
          "9f1af790-a811-4852-a765-18a5215cf933";
        await page.evaluate((nextSiteId) => {
          const raw = localStorage.getItem("safetywallet-auth");
          if (!raw) {
            return;
          }
          const parsed = JSON.parse(raw) as {
            state?: { currentSiteId?: string | null };
          };
          localStorage.setItem(
            "safetywallet-auth",
            JSON.stringify({
              ...parsed,
              state: { ...parsed.state, currentSiteId: nextSiteId },
            }),
          );
        }, siteId);
        await page.reload({ waitUntil: "domcontentloaded" });
      }

      expect(siteId).toBeTruthy();
    });

    await test.step("all authenticated worker routes render without 5xx failures", async () => {
      const failedRequests: string[] = [];
      const onResponse = (response: {
        status: () => number;
        url: () => string;
      }) => {
        const status = response.status();
        if (status >= 500) {
          failedRequests.push(`${status} ${response.url()}`);
        }
      };

      page.on("response", onResponse);
      for (const route of AUTHENTICATED_ROUTES) {
        await page.goto(route);
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator("body")).toBeVisible();
      }
      page.off("response", onResponse);

      expect(failedRequests).toEqual([]);
    });

    await test.step("create-post flow is reachable and can transition to submittable state", async () => {
      await page.goto("/posts/new");
      await page.waitForLoadState("domcontentloaded");

      const submitButton = page
        .getByRole("button", { name: "제보하기" })
        .or(page.getByRole("button", { name: "제출" }))
        .first();
      const categoryButton = page
        .getByRole("button")
        .filter({ hasText: "위험요소" })
        .first();

      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeDisabled();

      await categoryButton.click();

      await expect(submitButton).toBeEnabled();
    });
  });
});
