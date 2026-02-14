import { type Page, expect } from "@playwright/test";

/**
 * Admin login helper — reusable across all admin E2E tests.
 * Minimizes login calls to respect rate limiting (5 req/60s).
 */
export async function adminLogin(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/login");
    await page.getByPlaceholder("admin").fill("admin");
    await page.getByPlaceholder("••••••••").fill("admin123");
    await page.getByRole("button", { name: "로그인" }).click();

    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      return;
    } catch {
      const errorText = await page
        .locator(".text-destructive")
        .textContent()
        .catch(() => "");
      if (errorText && /제한|limit|429|too many/i.test(errorText)) {
        await page.waitForTimeout(15000);
        continue;
      }
      await page.waitForTimeout(5000);
    }
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Navigate to a page via sidebar link text.
 * Assumes user is already logged in and sidebar is visible.
 */
export async function navigateViaSidebar(
  page: Page,
  linkText: string,
): Promise<void> {
  const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
  await sidebar.getByText(linkText, { exact: false }).click();
}

/**
 * All admin sidebar navigation items with their expected URL patterns.
 */
export const SIDEBAR_ITEMS = [
  { label: "대시보드", urlPattern: /\/dashboard/ },
  { label: "제보 관리", urlPattern: /\/posts/ },
  { label: "회원 관리", urlPattern: /\/members/ },
  { label: "출근 현황", urlPattern: /\/attendance/ },
  { label: "포인트 관리", urlPattern: /\/points/ },
  { label: "승인 관리", urlPattern: /\/approvals/ },
  { label: "조치 현황", urlPattern: /\/actions/ },
  { label: "공지사항", urlPattern: /\/announcements/ },
  { label: "안전교육", urlPattern: /\/education/ },
  { label: "포상 관리", urlPattern: /\/rewards/ },
  { label: "투표 후보 관리", urlPattern: /\/votes/ },
  { label: "설정", urlPattern: /\/settings/ },
  { label: "운영 모니터링", urlPattern: /\/monitoring/ },
  { label: "감사 로그", urlPattern: /\/audit/ },
] as const;
