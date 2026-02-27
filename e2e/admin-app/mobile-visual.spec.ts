import { test, expect } from "@playwright/test";
import { adminLogin, SIDEBAR_ITEMS } from "./helpers";
import { emitE2eIssueToElk } from "../shared/elk";

type AdminMobileProbe = {
  label: string;
  path: string;
  finalUrl: string;
  criticalConsoleErrors: string[];
  failedRequests: string[];
  hasHorizontalOverflow: boolean;
};

const ADMIN_MOBILE_ROUTES = [
  { label: "대시보드", path: "/dashboard" },
  ...SIDEBAR_ITEMS.map((item) => ({ label: item.label, path: item.path })),
];

test.describe("Admin App - Mobile Visual View", () => {
  test.describe.configure({ timeout: 180_000 });

  test("checks mobile visual anomalies across admin sections @smoke", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await adminLogin(page);

    const probes: AdminMobileProbe[] = [];

    for (const route of ADMIN_MOBILE_ROUTES) {
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
          url.includes("manifest") ||
          url.includes("/api/health") ||
          url.includes("attendance-logs") ||
          url.includes("attendance/unmatched");
        if (!ignorable) {
          failedRequests.push(`${status} ${url}`);
        }
      };

      page.on("console", onConsole);
      page.on("response", onResponse);

      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });

      const safeLabel = route.label.replace(/\s+/g, "-");
      await page.screenshot({
        path: test.info().outputPath(`admin-mobile-visual-${safeLabel}.png`),
        fullPage: true,
      });

      page.off("console", onConsole);
      page.off("response", onResponse);

      probes.push({
        label: route.label,
        path: route.path,
        finalUrl: page.url(),
        criticalConsoleErrors,
        failedRequests,
        hasHorizontalOverflow,
      });

      await emitE2eIssueToElk(test.info(), {
        module: "e2e.admin.mobile.visual",
        message: `Admin mobile visual probe: ${route.label}`,
        metadata: {
          label: route.label,
          path: route.path,
          finalUrl: page.url(),
          criticalConsoleErrors,
          failedRequests,
          hasHorizontalOverflow,
        },
      });
    }

    await test.info().attach("admin-mobile-visual-probes", {
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
