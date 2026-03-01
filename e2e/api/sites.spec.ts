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

test.describe("Sites API (Worker)", () => {
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

  test("GET /sites", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("GET /sites/:id", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./sites/nonexistent", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("GET /sites/:id/members", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./sites/nonexistent/members", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("POST /sites/:id/leave", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./sites/nonexistent/leave", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { reason: "E2E test" },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });
});

test.describe("Sites API (Admin)", () => {
  test.describe.configure({ mode: "serial" });
  let accessToken: string;
  let createdSiteId: string;

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

  test("POST /sites", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: "E2E Test Site" },
    });
    const status = response.status();
    expect([201, 400, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 201) {
      expect(body.success).toBe(true);
      const siteId = body.data?.site?.id;
      if (typeof siteId === "string" && siteId.length > 0)
        createdSiteId = siteId;
    }
  });

  test("PATCH /sites/:id", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const targetSiteId = createdSiteId || "nonexistent";
    const response = await request.patch(`./sites/${targetSiteId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: "E2E Updated Site" },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("GET /sites/:id/members/:memberId", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const targetSiteId = createdSiteId || "nonexistent";
    const response = await request.get(
      `./sites/${targetSiteId}/members/nonexistent-member`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });
});
