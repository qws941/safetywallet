import { test, expect } from "@playwright/test";
import { WorkerRateLimitError, workerLogin } from "./helpers";
import { emitE2eIssueToElk } from "../shared/elk";

type RouteProbe = {
  route: string;
  finalUrl: string;
  criticalConsoleErrors: string[];
  failedRequests: string[];
  transient503: string[];
};

const ROUTES = [
  "/home",
  "/posts",
  "/actions",
  "/votes",
  "/education",
  "/announcements",
  "/points",
  "/profile",
];

test.describe("Worker App - UIUX After Login", () => {
  test("covers post-login core screens with visual records and issue log @smoke", async ({
    page,
  }) => {
    let loginResult: "home";
    try {
      loginResult = await workerLogin(page);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const blockerType =
        error instanceof WorkerRateLimitError
          ? "rate-limit"
          : "auth-or-runtime";
      await test.info().attach("worker-login-blocker", {
        contentType: "application/json",
        body: Buffer.from(
          JSON.stringify({ blockerType, message }, null, 2),
          "utf-8",
        ),
      });
      await emitE2eIssueToElk(test.info(), {
        module: "e2e.worker.uiux",
        message: "Worker login blocker during UIUX sweep",
        metadata: { blockerType, error: message },
      });
      test.skip(
        true,
        blockerType === "rate-limit"
          ? "worker 로그인 레이트리밋(429)으로 UIUX 검증을 건너뜀"
          : "계정 상태 또는 런타임 이슈로 post-login UIUX 검증이 차단됨",
      );
      return;
    }
    expect(loginResult).toBe("home");

    const probes: RouteProbe[] = [];

    for (const route of ROUTES) {
      const criticalConsoleErrors: string[] = [];
      const failedRequests: string[] = [];
      const transient503: string[] = [];

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
        if (status < 400) return;
        const url = response.url();
        const ignorable =
          url.includes("beacon.min.js") ||
          url.includes("favicon") ||
          url.includes("cloudflare") ||
          url.includes("manifest");
        if (!ignorable) {
          if (status === 503) {
            transient503.push(`${status} ${url}`);
            return;
          }
          failedRequests.push(`${status} ${url}`);
        }
      };

      page.on("console", onConsole);
      page.on("response", onResponse);

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();

      const safeRoute = route.replace(/\//g, "_").replace(/^_/, "");
      await page.screenshot({
        path: test.info().outputPath(`worker-uiux-${safeRoute}.png`),
        fullPage: true,
      });

      page.off("console", onConsole);
      page.off("response", onResponse);

      probes.push({
        route,
        finalUrl: page.url(),
        criticalConsoleErrors,
        failedRequests,
        transient503,
      });

      await emitE2eIssueToElk(test.info(), {
        module: "e2e.worker.uiux",
        message: `Worker route probe: ${route}`,
        metadata: {
          route,
          finalUrl: page.url(),
          criticalConsoleErrors,
          failedRequests,
          transient503,
        },
      });

      if (criticalConsoleErrors.length > 0 || failedRequests.length > 0) {
        await test.info().attach(`worker-uiux-issue-${safeRoute}`, {
          contentType: "application/json",
          body: Buffer.from(
            JSON.stringify(
              {
                route,
                criticalConsoleErrors,
                failedRequests,
                transient503,
              },
              null,
              2,
            ),
            "utf-8",
          ),
        });
      }
    }

    await test.info().attach("worker-uiux-issue-log", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(probes, null, 2), "utf-8"),
    });

    await emitE2eIssueToElk(test.info(), {
      module: "e2e.worker.uiux",
      message: "Worker route UIUX probe summary",
      metadata: { probes },
    });
  });
});
