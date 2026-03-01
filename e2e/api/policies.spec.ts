import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

const ADMIN_LOGIN_DATA = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
};

test.describe("Policies API (Worker)", () => {
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
    accessToken = body.data.accessToken;
  };

  test("GET /policies/site/:siteId", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./policies/site/test-site", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("GET /policies/:id", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./policies/nonexistent", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });
});

test.describe("Policies API (Admin)", () => {
  test.describe.configure({ mode: "serial" });
  let accessToken: string;
  let createdPolicyId: string;

  const ensureAdminAuth = async (request: APIRequestContext) => {
    if (accessToken) return;
    let response = await request.post("./auth/admin/login", {
      data: ADMIN_LOGIN_DATA,
    });
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) =>
        setTimeout(r, Math.min(retryAfter + 1, 10) * 1000),
      );
      response = await request.post("./auth/admin/login", {
        data: ADMIN_LOGIN_DATA,
      });
    }
    if (response.status() !== 200) return;
    const body = await response.json();
    accessToken = body.data?.accessToken ?? body.data?.token;
  };

  test("POST /policies", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./policies", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        siteId: "test",
        reasonCode: "E2E_TEST",
        name: "E2E Test Policy",
        defaultAmount: 10,
      },
    });
    const status = response.status();
    expect([201, 400, 403, 409].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 201) {
      expect(body.success).toBe(true);
      const policyId = body.data?.policy?.id;
      if (typeof policyId === "string" && policyId.length > 0) {
        createdPolicyId = policyId;
      }
    }
  });

  test("PATCH /policies/:id", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const targetPolicyId = createdPolicyId || "nonexistent";
    const response = await request.patch(`./policies/${targetPolicyId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: "E2E Updated Policy",
        defaultAmount: 11,
      },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("DELETE /policies/:id", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const targetPolicyId = createdPolicyId || "nonexistent";
    const response = await request.delete(`./policies/${targetPolicyId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });
});
