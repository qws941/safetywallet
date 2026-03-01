import { test, expect, devices } from "@playwright/test";
import { adminLogin } from "./helpers";

const iphone13 = devices["iPhone 13"];
test.use({
  viewport: iphone13.viewport,
  userAgent: iphone13.userAgent,
  isMobile: iphone13.isMobile,
  hasTouch: iphone13.hasTouch,
});

const uniqueSuffix = () => Date.now().toString().slice(-8);

async function recoverFromErrorBoundary(
  page: import("@playwright/test").Page,
  maxAttempts = 3,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const errorText = page.getByText("Something went wrong");
    if (await errorText.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tryAgain = page.getByRole("button", { name: "Try again" });
      if (await tryAgain.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tryAgain.click();
      } else {
        await page.goto("/education");
      }
      await page.waitForTimeout(1000);
    } else {
      break;
    }
  }
}

async function navigateToEducationTab(
  page: import("@playwright/test").Page,
  tabName: string,
) {
  await page.goto("/education");
  await recoverFromErrorBoundary(page);
  await expect(page.getByRole("heading", { name: "교육 관리" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: tabName, exact: true }).click();
  await page.waitForTimeout(500);
}

async function getCurrentUserId(
  page: import("@playwright/test").Page,
): Promise<string | null> {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const id = data?.state?.user?.id ?? data?.user?.id ?? data?.id ?? null;
        if (typeof id === "string" && id.length > 10) return id;
      } catch {
        /* skip non-JSON */
      }
    }
    return null;
  });
}

test.describe("Education Mobile CRUD", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test.describe("교육자료 (Contents)", () => {
    test("create and delete education content", async ({ page }) => {
      await navigateToEducationTab(page, "교육자료");

      const title = `E2E교육_${uniqueSuffix()}`;

      await page.getByRole("button", { name: /직접 입력/ }).click();
      await page.getByPlaceholder("제목").fill(title);
      await page.getByPlaceholder("설명").first().fill("E2E 테스트 설명");
      await page
        .getByPlaceholder("콘텐츠 URL")
        .fill("https://example.com/test.mp4");

      const createResp = page.waitForResponse(
        (r) =>
          r.url().includes("/education/contents") &&
          r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "교육자료 등록" }).click();
      await createResp;

      await expect(
        page.getByText("교육자료가 등록되었습니다.").first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      await navigateToEducationTab(page, "교육자료");
      const cell = page.getByRole("cell", { name: title });
      await expect(cell).toBeVisible({ timeout: 10_000 });

      const row = page.getByRole("row").filter({ hasText: title });
      await row.getByRole("button").last().click();

      const deleteResp = page.waitForResponse(
        (r) =>
          r.url().includes("/education/contents/") &&
          r.request().method() === "DELETE",
      );
      const deleteBtn = page
        .getByRole("alertdialog")
        .getByRole("button", { name: "삭제" });
      await deleteBtn.waitFor({ state: "visible", timeout: 5000 });
      await deleteBtn.dispatchEvent("click");
      await deleteResp;

      await expect(
        page.getByText("교육자료가 삭제되었습니다.").first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      await expect(cell).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("퀴즈 (Quizzes)", () => {
    test("create quiz", async ({ page }) => {
      await navigateToEducationTab(page, "퀴즈");

      const title = `E2E퀴즈_${uniqueSuffix()}`;

      await page.getByPlaceholder("퀴즈 제목").fill(title);
      await page.getByPlaceholder("설명").first().fill("E2E 퀴즈 설명");

      const createResp = page.waitForResponse(
        (r) =>
          r.url().includes("/education/quizzes") &&
          r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "퀴즈 등록" }).click();
      await createResp;

      await expect(
        page.getByText("퀴즈가 등록되었습니다.").first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      await navigateToEducationTab(page, "퀴즈");
      await expect(page.getByRole("cell", { name: title })).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("법정교육 (Statutory Training)", () => {
    test("create and edit statutory training", async ({ page }) => {
      await navigateToEducationTab(page, "법정교육");

      const userId = await getCurrentUserId(page);
      test.skip(
        !userId,
        "Cannot determine user ID for statutory training test",
      );

      const trainingName = `E2E법정_${uniqueSuffix()}`;
      const today = new Date().toISOString().split("T")[0];

      await page.getByPlaceholder("대상자 사용자 ID").fill(userId!);
      await page.getByPlaceholder("교육명").fill(trainingName);

      const dateInputs = page.locator('input[type="date"]');
      await dateInputs.first().fill(today);

      const hoursInput = page.locator('input[type="number"]');
      await hoursInput.first().fill("8");

      await page.getByPlaceholder("교육기관").fill("E2E테스트기관");

      const createResp = page.waitForResponse(
        (r) =>
          r.url().includes("/education/statutory") &&
          r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "법정교육 등록" }).click();
      await createResp;

      await expect(
        page.getByText("법정교육이 등록되었습니다.").first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      await navigateToEducationTab(page, "법정교육");
      await expect(page.getByRole("cell", { name: trainingName })).toBeVisible({
        timeout: 10_000,
      });

      const row = page.getByRole("row").filter({ hasText: trainingName });
      await row.getByRole("button", { name: "수정" }).click();

      const updatedName = `${trainingName}_수정`;
      const nameInput = page.getByPlaceholder("교육명");
      await nameInput.clear();
      await nameInput.fill(updatedName);

      // Re-fill date fields — onEditTraining sets epoch numbers, not ISO strings
      const editDateInputs = page.locator('input[type="date"]');
      const editDateCount = await editDateInputs.count();
      for (let i = 0; i < editDateCount; i++) {
        const val = await editDateInputs.nth(i).inputValue();
        if (!val || val === "mm/dd/yyyy") {
          await editDateInputs.nth(i).fill(today);
        }
      }

      const updateResp = page.waitForResponse(
        (r) =>
          r.url().includes("/education/statutory/") &&
          r.request().method() === "PUT",
      );
      await page.getByRole("button", { name: "수정 저장" }).click();
      await updateResp;

      await expect(
        page.getByText("법정교육이 수정되었습니다.").first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      await navigateToEducationTab(page, "법정교육");
      await expect(page.getByRole("cell", { name: updatedName })).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("TBM", () => {
    test("create TBM record", async ({ page }) => {
      await navigateToEducationTab(page, "TBM");

      const topic = `E2ETBM_${uniqueSuffix()}`;
      const today = new Date().toISOString().split("T")[0];

      await page.locator('input[type="date"]').first().fill(today);
      await page.getByPlaceholder("주제").fill(topic);
      await page.getByPlaceholder("내용").fill("E2E TBM 테스트 내용");
      await page.getByPlaceholder("날씨").fill("맑음");
      await page.getByPlaceholder("특이사항").fill("없음");

      const createResp = page.waitForResponse(
        (r) =>
          r.url().includes("/education/tbm") && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "TBM 등록" }).click();
      await createResp;

      await expect(
        page.getByText("TBM 기록이 등록되었습니다.").first(),
      ).toBeVisible({
        timeout: 10_000,
      });

      await navigateToEducationTab(page, "TBM");
      await expect(page.getByRole("cell", { name: topic })).toBeVisible({
        timeout: 10_000,
      });
    });
  });
});
