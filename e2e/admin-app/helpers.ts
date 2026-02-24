import { type Page, expect } from "@playwright/test";
import {
  computeRateLimitWaitMs,
  parseResetEpochSeconds,
  parseRetryAfterSeconds,
} from "../utils/rate-limit";

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin123";

export class AdminRateLimitError extends Error {
  constructor(message = "admin login rate limited") {
    super(message);
    this.name = "AdminRateLimitError";
  }
}

/**
 * Admin login helper — reusable across all admin E2E tests.
 * Minimizes login calls to respect rate limiting (5 req/60s).
 */
export async function adminLogin(page: Page): Promise<void> {
  const deadline = Date.now() + 70_000;
  let sawRateLimit = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (page.isClosed() || Date.now() >= deadline) {
      break;
    }

    await page.goto("/dashboard", {
      waitUntil: "networkidle",
      timeout: 10_000,
    });

    if (/\/dashboard/.test(page.url())) {
      const shellVisible = await page
        .locator(
          'aside, nav, [data-testid="sidebar"], [data-testid="mobile-menu-toggle"]',
        )
        .first()
        .isVisible()
        .catch(() => false);
      if (shellVisible) {
        return;
      }
    }

    await page.goto("/login", {
      waitUntil: "domcontentloaded",
      timeout: 10_000,
    });

    if (/\/dashboard/.test(page.url())) {
      return;
    }

    const usernameInput = page.getByPlaceholder("admin");
    const passwordInput = page.getByPlaceholder("••••••••");
    const loginButton = page.getByRole("button", { name: "로그인" });

    const usernameVisible = await usernameInput
      .first()
      .isVisible()
      .catch(() => false);
    const passwordVisible = await passwordInput
      .first()
      .isVisible()
      .catch(() => false);
    const loginVisible = await loginButton
      .first()
      .isVisible()
      .catch(() => false);

    if (!usernameVisible || !passwordVisible || !loginVisible) {
      if (/\/dashboard/.test(page.url())) {
        return;
      }
      continue;
    }

    await usernameInput.fill(ADMIN_USERNAME);
    await passwordInput.fill(ADMIN_PASSWORD);

    const loginResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/auth/admin/login") &&
        res.request().method() === "POST",
      { timeout: 20_000 },
    );

    await loginButton.click({ timeout: 5_000, noWaitAfter: true });

    const loginResponse = await loginResponsePromise.catch(() => null);

    try {
      const remaining = Math.max(5_000, deadline - Date.now());
      await expect(page).toHaveURL(/\/dashboard/, {
        timeout: Math.min(15_000, remaining),
      });
      return;
    } catch {
      if (page.isClosed() || Date.now() >= deadline) {
        break;
      }

      const retryAfterSeconds = parseRetryAfterSeconds(
        loginResponse?.headers()["retry-after"],
      );
      const resetEpoch = parseResetEpochSeconds(
        loginResponse?.headers()["x-ratelimit-reset"],
      );
      const resetWaitMs = computeRateLimitWaitMs(
        retryAfterSeconds,
        resetEpoch,
        8_000,
      );

      if (loginResponse?.status() === 429) {
        sawRateLimit = true;
        if (!page.isClosed()) {
          const remaining = Math.max(0, deadline - Date.now());
          await page.waitForTimeout(
            Math.min(Math.max(resetWaitMs, 8_000), remaining),
          );
        }
        continue;
      }

      const errorText = await page
        .locator(".text-destructive")
        .textContent()
        .catch(() => "");
      if (errorText && /제한|limit|429|too many/i.test(errorText)) {
        sawRateLimit = true;
        if (!page.isClosed()) {
          const remaining = Math.max(0, deadline - Date.now());
          await page.waitForTimeout(Math.min(8_000, remaining));
        }
        continue;
      }
      if (!page.isClosed()) {
        const remaining = Math.max(0, deadline - Date.now());
        await page.waitForTimeout(Math.min(2_000, remaining));
      }
    }
  }

  if (sawRateLimit) {
    throw new AdminRateLimitError(
      "admin login rate limit persisted after reset wait",
    );
  }

  if (page.isClosed()) {
    throw new Error(
      "admin login failed: page closed before dashboard redirect",
    );
  }

  throw new Error(`admin login failed: final URL ${page.url()}`);
}

export async function expectAdminShellVisible(page: Page) {
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          const selectors = [
            "aside",
            "nav",
            '[data-testid="sidebar"]',
            '[data-testid="mobile-menu-toggle"]',
          ];
          const nodes = selectors.flatMap((selector) =>
            Array.from(document.querySelectorAll(selector)),
          );
          return nodes.some((node) => {
            const element = node as HTMLElement;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          });
        });
      },
      { timeout: 10_000 },
    )
    .toBeTruthy();
}

/**
 * Navigate to a page via sidebar link text.
 * Assumes user is already logged in and sidebar is visible.
 */
export async function navigateViaSidebar(
  page: Page,
  linkText: string,
  fallbackPath?: string,
): Promise<void> {
  const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
  const item = sidebar.getByText(linkText, { exact: false }).first();
  const visible = await item.isVisible().catch(() => false);

  if (visible) {
    await item.click();
    return;
  }

  if (fallbackPath) {
    await page.goto(fallbackPath);
    return;
  }

  throw new Error(`sidebar item not found: ${linkText}`);
}

/**
 * All admin sidebar navigation items with their expected URL patterns.
 */
export const SIDEBAR_ITEMS = [
  { label: "대시보드", path: "/dashboard", urlPattern: /\/dashboard/ },
  { label: "제보 관리", path: "/posts", urlPattern: /\/posts/ },
  { label: "회원 관리", path: "/members", urlPattern: /\/members/ },
  { label: "출근 현황", path: "/attendance", urlPattern: /\/attendance/ },
  { label: "포인트 관리", path: "/points", urlPattern: /\/points/ },
  { label: "승인 관리", path: "/approvals", urlPattern: /\/approvals/ },
  { label: "조치 현황", path: "/actions", urlPattern: /\/actions/ },
  {
    label: "공지사항",
    path: "/announcements",
    urlPattern: /\/announcements/,
  },
  { label: "안전교육", path: "/education", urlPattern: /\/education/ },
  { label: "포상 관리", path: "/rewards", urlPattern: /\/rewards/ },
  { label: "투표 후보 관리", path: "/votes", urlPattern: /\/votes/ },
  { label: "설정", path: "/settings", urlPattern: /\/settings/ },
  {
    label: "운영 모니터링",
    path: "/monitoring",
    urlPattern: /\/monitoring/,
  },
  { label: "감사 로그", path: "/audit", urlPattern: /\/audit/ },
] as const;
