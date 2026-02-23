import type { Page } from "@playwright/test";

export class WorkerRateLimitError extends Error {
  constructor(message = "worker login rate limited") {
    super(message);
    this.name = "WorkerRateLimitError";
  }
}

export const WORKER_E2E_USER = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015803",
  dob: process.env.E2E_WORKER_DOB ?? "990308",
};

export async function workerLogin(page: Page) {
  const phoneVariants = Array.from(
    new Set([
      WORKER_E2E_USER.phone,
      WORKER_E2E_USER.phone.replace(/[^0-9]/g, ""),
      WORKER_E2E_USER.phone
        .replace(/[^0-9]/g, "")
        .replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3"),
    ]),
  );

  const dobVariants = Array.from(
    new Set([
      WORKER_E2E_USER.dob,
      WORKER_E2E_USER.dob.replace(/[^0-9]/g, ""),
      WORKER_E2E_USER.dob.length === 6
        ? `19${WORKER_E2E_USER.dob}`
        : WORKER_E2E_USER.dob,
    ]),
  );

  let sawRateLimit = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const phone of phoneVariants) {
      for (const dob of dobVariants) {
        await page.goto("/login");
        await page
          .getByRole("textbox", { name: "이름" })
          .fill(WORKER_E2E_USER.name);
        await page.getByRole("textbox", { name: "휴대폰 번호" }).fill(phone);
        await page.getByRole("textbox", { name: /생년월일/ }).fill(dob);

        const loginResponsePromise = page
          .waitForResponse(
            (res) =>
              res.url().includes("/auth/login") &&
              res.request().method() === "POST",
            { timeout: 20_000 },
          )
          .catch(() => null);

        await page.getByRole("button", { name: "로그인" }).click();
        const loginResponse = await loginResponsePromise;

        if (loginResponse?.status() === 429) {
          sawRateLimit = true;
        }

        if (loginResponse?.status() === 200) {
          await page.waitForURL("**/home**", {
            timeout: 20_000,
            waitUntil: "domcontentloaded",
          });
          return "home" as const;
        }

        const errorText =
          (await page.locator(".text-destructive").first().textContent())
            ?.toLowerCase()
            .trim() ?? "";

        if (
          errorText.includes("제한") ||
          errorText.includes("limit") ||
          errorText.includes("429") ||
          errorText.includes("too many")
        ) {
          sawRateLimit = true;
          await page.waitForTimeout(15_000);
        }
      }
    }
  }

  if (sawRateLimit) {
    throw new WorkerRateLimitError();
  }

  throw new Error(
    "worker login failed for provided credential set after retries",
  );
}
