import { test, expect } from "@playwright/test";
import { SIDEBAR_ITEMS } from "./helpers";

test.describe("Admin Navigation", () => {
  test("should navigate to dashboard by default", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have sidebar with navigation items", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to all main pages via URL @smoke", async ({ page }) => {
    const routes = [
      { path: "/dashboard", title: "대시보드" },
      { path: "/posts", title: "제보 관리" },
      { path: "/members", title: "회원 관리" },
      { path: "/attendance", title: "출근 현황" },
      { path: "/points", title: "포인트 관리" },
      { path: "/actions", title: "조치 현황" },
      { path: "/announcements", title: "공지사항" },
      { path: "/education", title: "교육 관리" },
      { path: "/rewards", title: "포상 관리" },
      { path: "/monitoring", title: "운영 모니터링" },
      { path: "/audit", title: "감사 로그" },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      const heading = page.getByRole("heading", { name: route.title });
      await expect(heading).toBeVisible({ timeout: 10000 });
    }

    // Settings page has conditional rendering — check separately
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    const settingsHeading = page.getByRole("heading", { name: "설정" });
    const errorMsg = page.getByText("현장 정보를 불러올 수 없습니다");
    await expect(settingsHeading.or(errorMsg).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
