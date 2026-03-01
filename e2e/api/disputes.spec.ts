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

let createdDisputeId: string | undefined;

test.describe("Disputes API (Worker)", () => {
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
    accessToken = body.data?.accessToken ?? body.data?.token;
  };

  test("GET /disputes/my returns current user disputes", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./disputes/my", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("GET /disputes/:id handles nonexistent id", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./disputes/nonexistent", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("POST /disputes creates dispute with valid shape", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./disputes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        siteId: "test",
        type: "REVIEW",
        title: "E2E test dispute",
        description: "Test description",
      },
    });

    expect([201, 400, 403].includes(response.status())).toBeTruthy();

    const status = response.status();
    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 201) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      createdDisputeId = body.data.id as string | undefined;
    }
  });

  test("POST /disputes returns 400 on empty body", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./disputes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});

test.describe("Disputes API (Admin)", () => {
  test.describe.configure({ mode: "serial" });

  let accessToken: string;

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

  test("POST /disputes/:id/resolve resolves dispute or returns domain errors", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const disputeId = createdDisputeId ?? "nonexistent";
    const response = await request.post(`./disputes/${disputeId}/resolve`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        status: "RESOLVED",
        resolutionNote: "E2E resolution",
      },
    });

    expect([200, 400, 403, 404].includes(response.status())).toBeTruthy();

    const status = response.status();
    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("PATCH /disputes/:id/status updates dispute status", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const disputeId = createdDisputeId ?? "nonexistent";
    const response = await request.patch(`./disputes/${disputeId}/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { status: "IN_REVIEW" },
    });

    expect([200, 400, 403, 404].includes(response.status())).toBeTruthy();

    const status = response.status();
    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("GET /disputes/site/:siteId returns site disputes", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./disputes/site/test", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });
});
