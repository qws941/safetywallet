import {
  getCachedToken,
  setCachedToken,
  acquireLock,
  releaseLock,
} from "../utils/token-cache";
import type { Page } from "@playwright/test";
import {
  computeRateLimitWaitMs,
  parseResetEpochSeconds,
  parseRetryAfterSeconds,
} from "../utils/rate-limit";

export class WorkerRateLimitError extends Error {
  constructor(message = "worker login rate limited") {
    super(message);
    this.name = "WorkerRateLimitError";
  }
}

export const WORKER_E2E_USER = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "990308",
};

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "https://safetywallet.jclee.me/api";

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin123";

let lastWorkerUnlockAt = 0;
let cachedAdminToken: string | null =
  getCachedToken("adminAccessToken") || null;

async function tryAdminLoginToken(): Promise<string | null> {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }
  await acquireLock();
  try {
    const cachedAdmin = getCachedToken("adminAccessToken");
    if (cachedAdmin) {
      cachedAdminToken = cachedAdmin;
      return cachedAdmin;
    }

    const deadline = Date.now() + 180_000;
    for (let attempt = 0; attempt < 6; attempt++) {
      let loginRes: Response;
      try {
        loginRes = await fetch(`${API_URL}/auth/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
          }),
        });
      } catch {
        // Network error (DNS, connection refused) — wait and retry
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }

      if (loginRes.status === 429) {
        const retryAfter = parseRetryAfterSeconds(
          loginRes.headers.get("retry-after"),
        );
        const resetEpoch = parseResetEpochSeconds(
          loginRes.headers.get("x-ratelimit-reset"),
        );
        const resetWaitMs = computeRateLimitWaitMs(
          retryAfter,
          resetEpoch,
          20_000,
        );
        const remaining = Math.max(0, deadline - Date.now());
        if (remaining === 0) {
          break;
        }
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(Math.max(resetWaitMs, 15_000), remaining),
          ),
        );
        continue;
      }

      if (!loginRes.ok) {
        throw new Error(
          `admin login failed for worker setup: ${loginRes.status}`,
        );
      }

      const loginBody = (await loginRes.json()) as {
        data?: {
          tokens?: { accessToken?: string };
          accessToken?: string;
        };
      };

      const token =
        loginBody.data?.tokens?.accessToken ??
        loginBody.data?.accessToken ??
        null;
      if (token) {
        cachedAdminToken = token;
        setCachedToken("adminAccessToken", token);
      }
      return token;
    }
    return null;
  } finally {
    releaseLock();
  }
}

async function syncWorkerMembershipFromAdmin(page: Page): Promise<boolean> {
  const session = await page.evaluate(async () => {
    try {
      const raw = localStorage.getItem("safetywallet-auth");
      const parsed = raw
        ? (JSON.parse(raw) as {
            state?: {
              accessToken?: string | null;
            };
          })
        : null;
      const accessToken = parsed?.state?.accessToken ?? null;
      if (!accessToken) {
        return { externalWorkerId: null as string | null };
      }

      const usersMeRes = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const usersMeBody = (await usersMeRes.json()) as {
        data?: { user?: { externalWorkerId?: string | null } };
      };

      return {
        externalWorkerId: usersMeBody.data?.user?.externalWorkerId ?? null,
      };
    } catch {
      return { externalWorkerId: null as string | null };
    }
  });

  if (!session.externalWorkerId) {
    return false;
  }

  const adminToken = await tryAdminLoginToken();
  if (!adminToken) {
    throw new WorkerRateLimitError("admin rate limit blocked worker site sync");
  }

  const membershipsRes = await fetch(`${API_URL}/users/me/memberships`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!membershipsRes.ok) {
    return false;
  }
  const membershipsBody = (await membershipsRes.json()) as {
    data?:
      | {
          memberships?: Array<{
            site?: { id?: string | null } | null;
            siteId?: string | null;
          }>;
        }
      | Array<{ site?: { id?: string | null } | null; siteId?: string | null }>;
  };
  const memberships = Array.isArray(membershipsBody.data)
    ? membershipsBody.data
    : (membershipsBody.data?.memberships ?? []);
  const adminSiteId =
    memberships[0]?.site?.id ?? memberships[0]?.siteId ?? null;
  if (!adminSiteId) {
    return false;
  }

  const syncRes = await fetch(`${API_URL}/admin/fas/sync-workers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      siteId: adminSiteId,
      workers: [
        {
          externalWorkerId: session.externalWorkerId,
          name: WORKER_E2E_USER.name,
          phone: WORKER_E2E_USER.phone,
          dob:
            WORKER_E2E_USER.dob.length === 6
              ? `19${WORKER_E2E_USER.dob}`
              : WORKER_E2E_USER.dob,
        },
      ],
    }),
  });

  return syncRes.ok;
}

async function unlockWorkerLoginLockout() {
  const now = Date.now();
  if (now - lastWorkerUnlockAt < 20_000) {
    return;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const adminAccessToken = await tryAdminLoginToken();
    if (!adminAccessToken) {
      continue;
    }

    try {
      const unlockRes = await fetch(`${API_URL}/admin/unlock-user-by-phone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: WORKER_E2E_USER.phone }),
      });

      if (!unlockRes.ok) {
        throw new Error(`worker unlock failed: ${unlockRes.status}`);
      }

      lastWorkerUnlockAt = now;
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      // Network or HTTP error — retry next attempt
    }
  }
  throw new WorkerRateLimitError(
    "admin rate limit blocked worker unlock reset",
  );
}

export async function ensureWorkerCurrentSite(
  page: Page,
): Promise<string | null> {
  const siteId = await page.evaluate(async (apiUrl) => {
    try {
      const raw = localStorage.getItem("safetywallet-auth");
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as {
        state?: {
          accessToken?: string | null;
          currentSiteId?: string | null;
        };
      };

      if (parsed.state?.currentSiteId) {
        return parsed.state.currentSiteId;
      }

      const accessToken = parsed.state?.accessToken;
      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as {
        data?: {
          siteId?: string | null;
          site?: { id?: string | null } | null;
          memberships?: Array<{
            site?: { id?: string | null } | null;
            siteId?: string | null;
          }>;
        };
      };

      const memberships = body.data?.memberships ?? [];
      const firstSiteId =
        body.data?.siteId ??
        body.data?.site?.id ??
        memberships[0]?.site?.id ??
        memberships[0]?.siteId ??
        null;

      if (!firstSiteId) {
        const membershipsRes = await fetch(`${apiUrl}/users/me/memberships`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const membershipsBody = (await membershipsRes.json()) as {
          data?:
            | {
                memberships?: Array<{
                  site?: { id?: string | null } | null;
                  siteId?: string | null;
                }>;
              }
            | Array<{
                site?: { id?: string | null } | null;
                siteId?: string | null;
              }>;
        };
        const list = Array.isArray(membershipsBody.data)
          ? membershipsBody.data
          : (membershipsBody.data?.memberships ?? []);
        const siteFromMemberships =
          list[0]?.site?.id ?? list[0]?.siteId ?? null;

        if (!siteFromMemberships) {
          return null;
        }

        const nextFromMemberships = {
          ...parsed,
          state: {
            ...parsed.state,
            currentSiteId: siteFromMemberships,
          },
        };
        localStorage.setItem(
          "safetywallet-auth",
          JSON.stringify(nextFromMemberships),
        );
        return siteFromMemberships;
      }

      const next = {
        ...parsed,
        state: {
          ...parsed.state,
          currentSiteId: firstSiteId,
        },
      };
      localStorage.setItem("safetywallet-auth", JSON.stringify(next));
      return firstSiteId;
    } catch {
      return null;
    }
  }, API_URL);

  if (siteId) {
    await page.reload({ waitUntil: "domcontentloaded" });
    return siteId;
  }

  const synced = await syncWorkerMembershipFromAdmin(page);
  if (!synced) {
    return null;
  }

  await page.waitForLoadState("networkidle");

  const syncedSiteId = await page.evaluate(async (apiUrl) => {
    try {
      const raw = localStorage.getItem("safetywallet-auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        state?: { accessToken?: string | null; currentSiteId?: string | null };
      };
      const accessToken = parsed.state?.accessToken;
      if (!accessToken) return null;
      const membershipsRes = await fetch(`${apiUrl}/users/me/memberships`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const membershipsBody = (await membershipsRes.json()) as {
        data?:
          | {
              memberships?: Array<{
                site?: { id?: string | null } | null;
                siteId?: string | null;
              }>;
            }
          | Array<{
              site?: { id?: string | null } | null;
              siteId?: string | null;
            }>;
      };
      const list = Array.isArray(membershipsBody.data)
        ? membershipsBody.data
        : (membershipsBody.data?.memberships ?? []);
      const siteId = list[0]?.site?.id ?? list[0]?.siteId ?? null;
      if (!siteId) return null;
      const next = {
        ...parsed,
        state: {
          ...parsed.state,
          currentSiteId: siteId,
        },
      };
      localStorage.setItem("safetywallet-auth", JSON.stringify(next));
      return siteId;
    } catch {
      return null;
    }
  }, API_URL);

  if (syncedSiteId) {
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  return syncedSiteId;
}

export async function workerLogin(page: Page) {
  await unlockWorkerLoginLockout();

  const phone = WORKER_E2E_USER.phone.replace(/[^0-9]/g, "");
  const dob = WORKER_E2E_USER.dob.replace(/[^0-9]/g, "");
  const deadline = Date.now() + 120_000;

  let sawRateLimit = false;

  while (Date.now() < deadline) {
    await page.goto("/login", {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
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

    if (loginResponse?.status() === 200) {
      await page.waitForURL("**/home**", {
        timeout: 20_000,
        waitUntil: "domcontentloaded",
      });
      return "home" as const;
    }

    const retryAfterSeconds = parseRetryAfterSeconds(
      loginResponse?.headers()["retry-after"],
    );
    const resetEpoch = parseResetEpochSeconds(
      loginResponse?.headers()["x-ratelimit-reset"],
    );

    const errorText =
      (await page.locator(".text-destructive").first().textContent())
        ?.toLowerCase()
        .trim() ?? "";

    if (
      loginResponse?.status() === 429 ||
      errorText.includes("제한") ||
      errorText.includes("limit") ||
      errorText.includes("429") ||
      errorText.includes("too many")
    ) {
      sawRateLimit = true;
      const resetWaitMs = computeRateLimitWaitMs(
        retryAfterSeconds,
        resetEpoch,
        20_000,
      );
      const remaining = Math.max(0, deadline - Date.now());
      if (remaining === 0) {
        break;
      }
      await page.waitForTimeout(
        Math.min(Math.max(resetWaitMs, 10_000), remaining),
      );
      continue;
    }

    await page.waitForTimeout(2_000);
  }

  if (sawRateLimit) {
    throw new WorkerRateLimitError(
      "worker login rate limit persisted after reset wait",
    );
  }

  throw new Error(
    "worker login failed for provided credential set after retries",
  );
}
