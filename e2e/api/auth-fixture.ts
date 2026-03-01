import { expect, type APIRequestContext } from "@playwright/test";

export const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

export const ADMIN_LOGIN_DATA = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
};

// Module-level cache: one login per worker process eliminates 429 rate-limit timeouts
let workerAccessToken: string | undefined;
let workerRefreshToken: string | undefined;
let workerUser: Record<string, unknown> | undefined;
let adminAccessToken: string | undefined;

async function loginWithRetry(
  request: APIRequestContext,
  url: string,
  data: Record<string, string>,
): Promise<import("@playwright/test").APIResponse> {
  let response = await request.post(url, { data });
  if (response.status() === 429) {
    const retryAfter = Number(response.headers()["retry-after"] || "60");
    await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
    response = await request.post(url, { data });
  }
  return response;
}

export async function getWorkerToken(
  request: APIRequestContext,
): Promise<string> {
  if (workerAccessToken) return workerAccessToken;
  const response = await loginWithRetry(
    request,
    "./auth/login",
    WORKER_LOGIN_DATA,
  );
  expect(response.status()).toBe(200);
  const body = await response.json();
  workerAccessToken = body.data.accessToken;
  workerRefreshToken = body.data.refreshToken;
  workerUser = body.data.user;
  return workerAccessToken;
}

export async function getWorkerAuth(request: APIRequestContext): Promise<{
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}> {
  await getWorkerToken(request);
  return {
    accessToken: workerAccessToken!,
    refreshToken: workerRefreshToken!,
    user: workerUser!,
  };
}

/** Returns `undefined` when admin login is unavailable. */
export async function getAdminToken(
  request: APIRequestContext,
): Promise<string | undefined> {
  if (adminAccessToken) return adminAccessToken;
  const response = await loginWithRetry(
    request,
    "./auth/admin/login",
    ADMIN_LOGIN_DATA,
  );
  if (response.status() !== 200) return undefined;
  const body = await response.json();
  adminAccessToken = body.data?.accessToken ?? body.data?.token;
  return adminAccessToken;
}
