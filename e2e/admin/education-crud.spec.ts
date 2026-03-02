import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { adminLogin } from "./helpers";

const uniqueSuffix = () => Date.now().toString().slice(-6);

async function getCurrentUserId(page: Page): Promise<string | null> {
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
        continue;
      }
    }

    return null;
  });
}

test.describe("Education CRUD Operations", () => {
  test.setTimeout(120_000);

  test("contents edit", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education");
    await page.getByRole("tab", { name: "교육자료" }).click();

    const title = `E2E 콘텐츠 ${uniqueSuffix()}`;
    const updatedTitle = `${title} 수정`;

    await page.getByRole("button", { name: /직접 입력/ }).click();
    await page.getByPlaceholder("제목").fill(title);
    await page.getByPlaceholder("설명").first().fill("E2E 콘텐츠 설명");
    await page
      .getByPlaceholder("콘텐츠 URL")
      .fill("https://example.com/e2e-content.mp4");

    const createContentResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/contents") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "교육자료 등록" }).click();
    await createContentResponse;
    await expect(
      page.getByText("교육자료가 등록되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "교육자료" }).click();

    const contentRow = page.getByRole("row").filter({ hasText: title });
    await expect(contentRow).toBeVisible();
    await contentRow.getByRole("button").first().click();

    await expect(page.getByText("교육 콘텐츠 수정").first()).toBeVisible();
    await page.getByPlaceholder("제목").fill(updatedTitle);

    const updateContentResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/contents/") &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "교육 콘텐츠 수정" }).click();
    await updateContentResponse;
    await expect(
      page.getByText("교육 콘텐츠가 수정되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "교육자료" }).click();
    await expect(page.getByRole("cell", { name: updatedTitle })).toBeVisible();
  });

  test("quiz edit", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education");
    await page.getByRole("tab", { name: "퀴즈" }).click();

    const quizTitle = `E2E 퀴즈 ${uniqueSuffix()}`;
    const updatedQuizTitle = `${quizTitle} 수정`;

    await page.getByPlaceholder("퀴즈 제목").fill(quizTitle);

    const createQuizResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/quizzes") &&
        !resp.url().includes("/questions") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "퀴즈 등록" }).click();
    await createQuizResponse;
    await expect(
      page.getByText("퀴즈가 등록되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "퀴즈" }).click();

    const quizRow = page.getByRole("row").filter({ hasText: quizTitle });
    await expect(quizRow).toBeVisible();
    await quizRow.getByRole("button").first().click();

    await expect(page.getByText("퀴즈 수정").first()).toBeVisible();
    await page.getByPlaceholder("퀴즈 제목").fill(updatedQuizTitle);

    const updateQuizResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/quizzes/") &&
        resp.request().method() === "PATCH" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "퀴즈 수정" }).click();
    await updateQuizResponse;
    await expect(
      page.getByText("퀴즈가 수정되었습니다.").first(),
    ).toBeVisible();
  });

  test("quiz delete", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education");
    await page.getByRole("tab", { name: "퀴즈" }).click();

    const quizTitle = `E2E 삭제 퀴즈 ${uniqueSuffix()}`;

    await page.getByPlaceholder("퀴즈 제목").fill(quizTitle);

    const createQuizResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/quizzes") &&
        !resp.url().includes("/questions") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "퀴즈 등록" }).click();
    await createQuizResponse;
    await expect(
      page.getByText("퀴즈가 등록되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "퀴즈" }).click();

    const quizRow = page.getByRole("row").filter({ hasText: quizTitle });
    await expect(quizRow).toBeVisible();
    await quizRow.getByRole("button").nth(1).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("퀴즈 삭제")).toBeVisible();
    await expect(
      dialog.getByText("퀴즈를 삭제하시겠습니까? 관련 문항도 함께 삭제됩니다."),
    ).toBeVisible();

    const deleteQuizResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/quizzes/") &&
        resp.request().method() === "DELETE" &&
        resp.status() === 200,
    );

    await dialog.getByRole("button", { name: "삭제" }).click();
    await deleteQuizResponse;
    await expect(
      page.getByText("퀴즈가 삭제되었습니다.").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: quizTitle }),
    ).toHaveCount(0);
  });

  test("statutory delete", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education");
    await page.getByRole("tab", { name: "법정교육" }).click();

    const userId = await getCurrentUserId(page);
    test.skip(!userId, "Cannot determine user ID for statutory training test");

    const trainingName = `E2E 법정교육 ${uniqueSuffix()}`;
    const today = new Date().toISOString().split("T")[0];

    await page.getByPlaceholder("대상자 사용자 ID").fill(userId!);
    await page.getByPlaceholder("교육명").fill(trainingName);
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(today);
    await dateInputs.nth(1).fill(today);
    await page.locator('input[type="number"]').first().fill("8");
    await page.getByPlaceholder("교육기관").fill("E2E 테스트 교육기관");

    const createStatutoryResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/statutory") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "법정교육 등록" }).click();
    await createStatutoryResponse;
    await expect(
      page.getByText("법정교육이 등록되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "법정교육" }).click();

    const statutoryRow = page
      .getByRole("row")
      .filter({ hasText: trainingName });
    await expect(statutoryRow).toBeVisible();
    await statutoryRow.getByRole("button").last().click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("법정교육 삭제")).toBeVisible();
    await expect(
      dialog.getByText("법정교육 기록을 삭제하시겠습니까?"),
    ).toBeVisible();

    const deleteStatutoryResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/statutory/") &&
        resp.request().method() === "DELETE" &&
        resp.status() === 200,
    );

    await dialog.getByRole("button", { name: "삭제" }).click();
    await deleteStatutoryResponse;
    await expect(
      page.getByText("법정교육이 삭제되었습니다.").first(),
    ).toBeVisible();
  });

  test("tbm edit", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education");
    await page.getByRole("tab", { name: "TBM" }).click();

    const topic = `E2E TBM ${uniqueSuffix()}`;
    const updatedTopic = `${topic} 수정`;
    const today = new Date().toISOString().split("T")[0];

    await page.locator('input[type="date"]').first().fill(today);
    await page.getByPlaceholder("주제").fill(topic);

    const createTbmResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/tbm") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "TBM 등록" }).click();
    await createTbmResponse;
    await expect(
      page.getByText("TBM 기록이 등록되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "TBM" }).click();

    const tbmRow = page.getByRole("row").filter({ hasText: topic });
    await expect(tbmRow).toBeVisible();
    await tbmRow.getByRole("button").nth(1).click();

    await expect(page.getByText("TBM 기록 수정").first()).toBeVisible();
    await page.getByPlaceholder("주제").fill(updatedTopic);

    const updateTbmResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/tbm/") &&
        resp.request().method() === "PUT" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "TBM 수정" }).click();
    await updateTbmResponse;
    await expect(
      page.getByText("TBM 기록이 수정되었습니다.").first(),
    ).toBeVisible();
  });

  test("tbm delete", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/education");
    await page.getByRole("tab", { name: "TBM" }).click();

    const topic = `E2E TBM 삭제 ${uniqueSuffix()}`;
    const today = new Date().toISOString().split("T")[0];

    await page.locator('input[type="date"]').first().fill(today);
    await page.getByPlaceholder("주제").fill(topic);

    const createTbmResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/tbm") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
    );

    await page.getByRole("button", { name: "TBM 등록" }).click();
    await createTbmResponse;
    await expect(
      page.getByText("TBM 기록이 등록되었습니다.").first(),
    ).toBeVisible();

    await page.goto("/education");
    await page.getByRole("tab", { name: "TBM" }).click();

    const tbmRow = page.getByRole("row").filter({ hasText: topic });
    await expect(tbmRow).toBeVisible();
    await tbmRow.getByRole("button").nth(2).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("TBM 기록 삭제")).toBeVisible();
    await expect(
      dialog.getByText("TBM 기록을 삭제하시겠습니까?"),
    ).toBeVisible();

    const deleteTbmResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/education/tbm/") &&
        resp.request().method() === "DELETE" &&
        resp.status() === 200,
    );

    await dialog.getByRole("button", { name: "삭제" }).click();
    await deleteTbmResponse;
    await expect(
      page.getByText("TBM 기록이 삭제되었습니다.").first(),
    ).toBeVisible();
  });
});
