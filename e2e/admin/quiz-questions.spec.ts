import { test, expect, Page } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * Recover from Next.js error boundary ("Something went wrong").
 * Clicks "Try again" then full-reloads if needed. Throws on persistent failure.
 */
async function recoverFromErrorBoundary(
  page: Page,
  maxAttempts = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const hasError = await page
      .getByText("Something went wrong")
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (!hasError) return;

    const tryAgainBtn = page.getByRole("button", { name: "Try again" });
    const canRetry = await tryAgainBtn
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    if (canRetry) {
      await tryAgainBtn.click();
      await page.waitForTimeout(2_000);
    } else {
      await page.goto("/education", { waitUntil: "networkidle" });
    }
  }

  const stillBroken = await page
    .getByText("Something went wrong")
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (stillBroken) {
    throw new Error(
      `Education page error boundary persists after ${maxAttempts} recovery attempts`,
    );
  }
}

/** Select a value from a Radix/shadcn Select by matching the trigger's displayed text. */
async function selectRadixOption(
  page: Page,
  triggerText: string | RegExp,
  optionName: string | RegExp,
): Promise<void> {
  await page.getByRole("combobox").filter({ hasText: triggerText }).click();
  await page.getByRole("option", { name: optionName }).click();
}

test.describe("Admin App - Quiz Question Management", () => {
  // Login + quiz creation + 3 question types + edit + delete + assertions
  test.setTimeout(120_000);

  test("can create quiz, add SINGLE_CHOICE/OX/SHORT_ANSWER questions, edit, and delete", async ({
    page,
  }) => {
    await adminLogin(page);
    await page.goto("/education", { waitUntil: "networkidle" });
    await recoverFromErrorBoundary(page);

    await page.getByRole("button", { name: "퀴즈" }).click();
    await page.waitForTimeout(500);
    await recoverFromErrorBoundary(page);

    const quizTitle = `E2E Quiz ${Date.now()}`;
    await page.getByPlaceholder("퀴즈 제목").fill(quizTitle);

    const createQuizRes = page.waitForResponse(
      (r) =>
        r.url().includes("/education/quizzes") &&
        !r.url().includes("/questions") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "퀴즈 등록" }).click();
    expect((await createQuizRes).status()).toBeLessThan(400);
    await expect(page.getByText("퀴즈가 등록되었습니다.")).toBeVisible();

    await page.goto("/education", { waitUntil: "networkidle" });
    await recoverFromErrorBoundary(page);
    await page.getByRole("button", { name: "퀴즈" }).click();
    await page.waitForTimeout(500);

    const quizRow = page.getByRole("row").filter({ hasText: quizTitle });
    await expect(quizRow).toBeVisible({ timeout: 15_000 });
    await quizRow.getByRole("button", { name: /문항 관리/ }).click();
    await expect(page.getByText(`문항 관리 - ${quizTitle}`)).toBeVisible();
    await expect(page.getByText("등록된 문항이 없습니다.")).toBeVisible();

    await page.getByPlaceholder("문항").fill("안전모 착용 의무가 있는 장소는?");
    await page.getByPlaceholder("선택지 1").fill("사무실");
    await page.getByPlaceholder("선택지 2").fill("건설현장");
    await page.getByPlaceholder("선택지 3").fill("주차장");
    await page.getByPlaceholder("선택지 4").fill("식당");
    await selectRadixOption(page, "1번", "2번");

    const addQ1 = page.waitForResponse(
      (r) => r.url().includes("/questions") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "문항 추가" }).click();
    expect((await addQ1).status()).toBeLessThan(400);
    await expect(page.getByText("문항이 등록되었습니다.")).toBeVisible();
    await expect(
      page.getByText("안전모 착용 의무가 있는 장소는?"),
    ).toBeVisible();

    await page
      .getByPlaceholder("문항")
      .fill("고소작업 시 안전대는 선택사항이다");
    await selectRadixOption(page, "단일 선택", "OX 퀴즈");

    const addQ2 = page.waitForResponse(
      (r) => r.url().includes("/questions") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "문항 추가" }).click();
    expect((await addQ2).status()).toBeLessThan(400);
    await expect(page.getByText("문항이 등록되었습니다.")).toBeVisible();
    await expect(
      page.getByText("고소작업 시 안전대는 선택사항이다"),
    ).toBeVisible();

    await page
      .getByPlaceholder("문항")
      .fill("산업안전보건법 영문 약자를 쓰시오");
    await selectRadixOption(page, "단일 선택", "주관식");
    await page.getByPlaceholder("정답 텍스트").fill("OSHA");

    const addQ3 = page.waitForResponse(
      (r) => r.url().includes("/questions") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "문항 추가" }).click();
    expect((await addQ3).status()).toBeLessThan(400);
    await expect(page.getByText("문항이 등록되었습니다.")).toBeVisible();
    await expect(
      page.getByText("산업안전보건법 영문 약자를 쓰시오"),
    ).toBeVisible();

    const scContainer = page
      .locator("div")
      .filter({ hasText: "안전모 착용 의무가 있는 장소는?" })
      .filter({ has: page.getByRole("button", { name: "수정" }) })
      .last();
    await scContainer.getByRole("button", { name: "수정" }).click();

    await expect(page.getByPlaceholder("문항")).toHaveValue(
      "안전모 착용 의무가 있는 장소는?",
    );
    await page.getByPlaceholder("문항").fill("안전모 착용이 필수인 장소는?");

    const editRes = page.waitForResponse(
      (r) => r.url().includes("/questions/") && r.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "문항 수정" }).click();
    expect((await editRes).status()).toBeLessThan(400);
    await expect(page.getByText("문항이 수정되었습니다.")).toBeVisible();
    await expect(page.getByText("안전모 착용이 필수인 장소는?")).toBeVisible();

    const oxContainer = page
      .locator("div")
      .filter({ hasText: "고소작업 시 안전대는 선택사항이다" })
      .filter({ has: page.getByRole("button", { name: "삭제" }) })
      .last();

    const delRes = page.waitForResponse(
      (r) =>
        r.url().includes("/questions/") && r.request().method() === "DELETE",
    );
    await oxContainer.getByRole("button", { name: "삭제" }).click();
    expect((await delRes).status()).toBeLessThan(400);
    await expect(page.getByText("문항이 삭제되었습니다.")).toBeVisible();

    await expect(
      page.getByText("고소작업 시 안전대는 선택사항이다"),
    ).not.toBeVisible();
    await expect(page.getByText("안전모 착용이 필수인 장소는?")).toBeVisible();
    await expect(
      page.getByText("산업안전보건법 영문 약자를 쓰시오"),
    ).toBeVisible();
  });
});
