import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

test.describe("Posts API", () => {
  test.describe.configure({ mode: "serial" });

  let accessToken: string;

  const ensureAuth = async (request: APIRequestContext) => {
    if (accessToken) return;
    let response = await request.post("./auth/login", {
      data: WORKER_LOGIN_DATA,
    });
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
      response = await request.post("./auth/login", {
        data: WORKER_LOGIN_DATA,
      });
    }
    expect(response.status()).toBe(200);
    const body = await response.json();
    accessToken = body.data.accessToken;
  };

  test("GET /posts returns list with valid auth", async ({ request }) => {
    await ensureAuth(request);
    const response = await request.get("./posts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("GET /posts response has correct envelope shape", async ({
    request,
  }) => {
    await ensureAuth(request);
    const response = await request.get("./posts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("timestamp");
  });
});
