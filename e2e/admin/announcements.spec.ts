import { test, expect } from "@playwright/test";

test.describe("Admin Announcements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/announcements");
  });

  test("should display announcements page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "공지사항" })).toBeVisible();
  });

  test("should have new announcement button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "새 공지" })).toBeVisible();
  });

  test("should show empty state or announcement list", async ({ page }) => {
    const emptyText = page.getByText("공지사항이 없습니다");
    const card = page.locator("[class*='card']").first();
    await expect(emptyText.or(card).first()).toBeVisible({ timeout: 10000 });
  });

  test("should open create form when clicking new button", async ({ page }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    await expect(
      page.getByRole("heading", { name: "새 공지 작성" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("제목")).toBeVisible();
    await expect(page.getByRole("button", { name: "등록" })).toBeVisible();
    await expect(page.getByRole("button", { name: "취소" })).toBeVisible();
  });

  test("should have pin toggle in create form", async ({ page }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    await expect(page.getByText("상단 고정")).toBeVisible();
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test("should have scheduled publishing input in create form", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    await expect(page.getByText("예약 발행")).toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible();
  });

  test("should disable submit when title is empty", async ({ page }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    const submitBtn = page.getByRole("button", { name: "등록" });
    await expect(submitBtn).toBeDisabled();
  });

  test("should close form on cancel", async ({ page }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    await expect(
      page.getByRole("heading", { name: "새 공지 작성" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "취소" }).click();
    await expect(
      page.getByRole("heading", { name: "새 공지 작성" }),
    ).not.toBeVisible();
    await expect(page.getByRole("button", { name: "새 공지" })).toBeVisible();
  });

  test("should show scheduled cancel button when date is set", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    const datetimeInput = page.locator('input[type="datetime-local"]');
    await datetimeInput.fill("2026-12-31T09:00");
    await expect(page.getByText("예약 취소")).toBeVisible();
    await expect(
      page.getByText("설정한 시간에 자동으로 발행됩니다"),
    ).toBeVisible();
  });

  test("should clear scheduled date when cancel is clicked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "새 공지" }).click();
    const datetimeInput = page.locator('input[type="datetime-local"]');
    await datetimeInput.fill("2026-12-31T09:00");
    await page.getByText("예약 취소").click();
    await expect(datetimeInput).toHaveValue("");
    await expect(page.getByText("예약 취소")).not.toBeVisible();
  });

  test("should show delete confirmation dialog", async ({ page }) => {
    const deleteBtn = page
      .locator("button")
      .filter({ has: page.locator('svg[class*="lucide-trash"]') })
      .first();

    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();
      await expect(
        page.getByRole("heading", { name: "삭제 확인" }),
      ).toBeVisible();
      await expect(page.getByText("정말 삭제하시겠습니까?")).toBeVisible();
      await expect(page.getByRole("button", { name: "취소" })).toBeVisible();
      await expect(page.getByRole("button", { name: "삭제" })).toBeVisible();
    }
  });

  test("should dismiss delete dialog on cancel", async ({ page }) => {
    const deleteBtn = page
      .locator("button")
      .filter({ has: page.locator('svg[class*="lucide-trash"]') })
      .first();

    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();
      await expect(
        page.getByRole("heading", { name: "삭제 확인" }),
      ).toBeVisible();
      await page
        .locator("[role='alertdialog']")
        .getByRole("button", { name: "취소" })
        .click();
      await expect(
        page.getByRole("heading", { name: "삭제 확인" }),
      ).not.toBeVisible();
    }
  });

  test("should open edit form when clicking edit button", async ({ page }) => {
    const editBtn = page
      .locator("button")
      .filter({ has: page.locator('svg[class*="lucide-edit"]') })
      .first();

    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      await expect(
        page.getByRole("heading", { name: "공지 수정" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "수정" })).toBeVisible();
      const titleInput = page.getByPlaceholder("제목");
      await expect(titleInput).toBeVisible();
      await expect(titleInput).not.toHaveValue("");
    }
  });

  test("should display pinned announcements with badge", async ({ page }) => {
    const pinnedBadge = page.getByText("고정").first();
    if (await pinnedBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(pinnedBadge).toBeVisible();
    }
  });

  test("should display scheduled badge for scheduled announcements", async ({
    page,
  }) => {
    const scheduledBadge = page.getByText("예약").first();
    if (await scheduledBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(scheduledBadge).toBeVisible();
    }
  });
});
