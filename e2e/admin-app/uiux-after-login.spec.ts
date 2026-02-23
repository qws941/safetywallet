import {
  test,
  expect,
  type ConsoleMessage,
  type Response,
} from "@playwright/test";
import { adminLogin, navigateViaSidebar, SIDEBAR_ITEMS } from "./helpers";
import { emitE2eIssueToElk } from "../shared/elk";

type AdminProbe = {
  label: string;
  finalUrl: string;
  criticalConsoleErrors: string[];
  failedRequests: string[];
  transient503: string[];
};

test.describe("Admin App - UIUX After Login", () => {
  test("covers all sidebar sections with visual records and issue log @smoke", async ({
    page,
  }) => {
    await adminLogin(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

    const probes: AdminProbe[] = [];

    for (const item of SIDEBAR_ITEMS) {
      const criticalConsoleErrors: string[] = [];
      const failedRequests: string[] = [];
      const transient503: string[] = [];

      const onConsole = (msg: ConsoleMessage) => {
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

      const onResponse = (response: Response) => {
        const status = response.status();
        if (status < 400) return;
        const url = response.url();
        const ignorable =
          url.includes("beacon.min.js") ||
          url.includes("favicon") ||
          url.includes("cloudflare") ||
          url.includes("/api/health") ||
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

      await navigateViaSidebar(page, item.label);
      await expect(page).toHaveURL(item.urlPattern, { timeout: 20000 });
      await expect(page.locator("body")).toBeVisible();

      const safeLabel = item.label.replace(/\s+/g, "-");
      await page.screenshot({
        path: test.info().outputPath(`admin-uiux-${safeLabel}.png`),
        fullPage: true,
      });

      page.off("console", onConsole);
      page.off("response", onResponse);

      probes.push({
        label: item.label,
        finalUrl: page.url(),
        criticalConsoleErrors,
        failedRequests,
        transient503,
      });

      await emitE2eIssueToElk(test.info(), {
        module: "e2e.admin.uiux",
        message: `Admin sidebar probe: ${item.label}`,
        metadata: {
          label: item.label,
          finalUrl: page.url(),
          criticalConsoleErrors,
          failedRequests,
          transient503,
        },
      });

      if (criticalConsoleErrors.length > 0 || failedRequests.length > 0) {
        await test.info().attach(`admin-uiux-issue-${safeLabel}`, {
          contentType: "application/json",
          body: Buffer.from(
            JSON.stringify(
              {
                label: item.label,
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

    await test.info().attach("admin-uiux-issue-log", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(probes, null, 2), "utf-8"),
    });

    await emitE2eIssueToElk(test.info(), {
      module: "e2e.admin.uiux",
      message: "Admin sidebar UIUX probe summary",
      metadata: { probes },
    });
  });
});
