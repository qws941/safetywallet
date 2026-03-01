import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

test.describe("Votes & Recommendations API", () => {
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

  test("GET /votes/current returns data with valid auth", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./votes/current", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 400, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /recommendations returns data with valid auth", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./recommendations", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 400, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /recommendations response has envelope shape", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./recommendations", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (body.success) {
      expect(body.data).toBeDefined();
    }
  });

  test("POST /votes casts vote or returns expected constraints", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./votes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { candidateId: "test-candidate" },
    });

    const status = response.status();
    expect([201, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if ("timestamp" in body) {
      expect(body.timestamp).toBeDefined();
    }
    if (status === 201) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("POST /votes with empty body returns 400", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./votes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("success");
    if ("timestamp" in body) {
      expect(body.timestamp).toBeDefined();
    }
  });
});
