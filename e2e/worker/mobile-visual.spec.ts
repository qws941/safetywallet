import { test, expect } from "@playwright/test";
import { ensureWorkerCurrentSite, workerLogin } from "./helpers";
import { emitE2eIssueToElk } from "../shared/elk";

type MobileProbe = {
  route: string;
  finalUrl: string;
  criticalConsoleErrors: string[];
  failedRequests: string[];
  hasHorizontalOverflow: boolean;
};

const AUTH_ROUTES = [
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

test.describe("Worker App - Mobile Visual View", () => {
  test.describe.configure({ timeout: 180_000 });

  test("checks post-login mobile visual anomalies across all worker routes @smoke", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const loginResult = await workerLogin(page);
    expect(loginResult).toBe("home");
    await ensureWorkerCurrentSite(page);

    const probes: MobileProbe[] = [];

    for (const route of AUTH_ROUTES) {
      const criticalConsoleErrors: string[] = [];
      const failedRequests: string[] = [];

      const onConsole = (msg: { type: () => string; text: () => string }) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        const ignorable =
          text.includes("favicon") ||
          text.includes("beacon.min.js") ||
          text.includes("cloudflare") ||
          text.includes("Failed to fetch RSC payload") ||
          text.includes("falling back to browser navigation") ||
          text.includes("net::ERR_CERT_AUTHORITY_INVALID") ||
          text.includes("Failed to load resource: net::ERR_") ||
          text.includes("Content-Security-Policy") ||
          text.includes("Content Security Policy");
        if (!ignorable) {
          criticalConsoleErrors.push(text);
        }
      };

      const onResponse = (response: {
        status: () => number;
        url: () => string;
      }) => {
        const status = response.status();
        if (status < 500) return;
        const url = response.url();
        const ignorable =
          url.includes("beacon.min.js") ||
          url.includes("favicon") ||
          url.includes("cloudflare") ||
          url.includes("manifest");
        if (!ignorable) {
          failedRequests.push(`${status} ${url}`);
        }
      };

      page.on("console", onConsole);
      page.on("response", onResponse);

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });

      const safeRoute = route.replace(/\//g, "_").replace(/^_/, "root");
      await page.screenshot({
        path: test.info().outputPath(`worker-mobile-visual-${safeRoute}.png`),
        fullPage: true,
      });

      page.off("console", onConsole);
      page.off("response", onResponse);

      probes.push({
        route,
        finalUrl: page.url(),
        criticalConsoleErrors,
        failedRequests,
        hasHorizontalOverflow,
      });

      await emitE2eIssueToElk(test.info(), {
        module: "e2e.worker.mobile.visual",
        message: `Worker mobile visual probe: ${route}`,
        metadata: {
          route,
          finalUrl: page.url(),
          criticalConsoleErrors,
          failedRequests,
          hasHorizontalOverflow,
        },
      });
    }

    await test.info().attach("worker-mobile-visual-probes", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(probes, null, 2), "utf-8"),
    });

    const anomalies = probes.filter(
      (probe) =>
        probe.hasHorizontalOverflow ||
        probe.criticalConsoleErrors.length > 0 ||
        probe.failedRequests.length > 0,
    );

    expect(anomalies).toEqual([]);
  });
});
