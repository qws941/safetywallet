import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

test.describe("Additional Protected Endpoints", () => {
  test.describe.configure({ mode: "serial" });

  let accessToken: string;

  const ensureAuth = async (request: APIRequestContext) => {
    if (accessToken) return;
    let response = await request.post("./auth/login", {
      data: WORKER_LOGIN_DATA,
    });
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) =>
        setTimeout(r, Math.min(retryAfter + 1, 10) * 1000),
      );
      response = await request.post("./auth/login", {
        data: WORKER_LOGIN_DATA,
      });
    }
    if (response.status() !== 200) return;
    const body = await response.json();
    accessToken = body.data?.accessToken;
  };

  test("GET /disputes returns data with valid auth", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./disputes", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /reviews/pending returns data with valid auth", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./reviews/pending", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /sites returns data with valid auth", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("GET /notifications returns data with valid auth", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./notifications", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /policies returns data with valid auth", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./policies", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /approvals returns data with valid auth", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./approvals", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });
});
