import { test, expect } from "@playwright/test";
import { adminLogin } from "./helpers";

function uniqueSuffix() {
  return Date.now().toString().slice(-8);
}

test.describe("Admin Education Registration", () => {
  test("registers a quiz via real admin flow", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/login")) {
      await adminLogin(page);
    }

    await page.goto("/education");
    await expect(
      page.getByRole("heading", { name: "교육 관리" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "퀴즈" }).click();

    const quizTitle = `E2E 퀴즈 ${uniqueSuffix()}`;
    await page.getByPlaceholder("퀴즈 제목").fill(quizTitle);

    const createQuizResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/education/quizzes") &&
        response.request().method() === "POST" &&
        response.status() < 400,
    );

    await page.getByRole("button", { name: "퀴즈 등록" }).click();
    await createQuizResponse;

    await expect(page.getByText("퀴즈가 등록되었습니다.")).toBeVisible();
    await expect(page.getByRole("cell", { name: quizTitle })).toBeVisible();
  });

  test("registers a TBM record via real admin flow", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/login")) {
      await adminLogin(page);
    }

    await page.goto("/education");
    await expect(
      page.getByRole("heading", { name: "교육 관리" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "TBM" }).click();

    const today = new Date().toISOString().slice(0, 10);
    const tbmTopic = `E2E TBM ${uniqueSuffix()}`;

    await page.locator('input[type="date"]').first().fill(today);
    await page.getByPlaceholder("주제").fill(tbmTopic);

    const createTbmResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/education/tbm") &&
        response.request().method() === "POST" &&
        response.status() < 400,
    );

    await page.getByRole("button", { name: "TBM 등록" }).click();
    await createTbmResponse;

    await expect(page.getByText("TBM 기록이 등록되었습니다.")).toBeVisible();
    await expect(page.getByRole("cell", { name: tbmTopic })).toBeVisible();
  });
});
