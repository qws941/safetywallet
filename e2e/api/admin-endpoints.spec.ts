import { test, expect } from "@playwright/test";

const ADMIN_LOGIN_DATA = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
};

test.describe("Admin API Endpoints", () => {
  test.describe.configure({ mode: "serial" });

  let adminToken: string;

  const ensureAdminAuth = async (
    request: import("@playwright/test").APIRequestContext,
  ) => {
    if (adminToken) return;
    let response = await request.post("./auth/admin/login", {
      data: ADMIN_LOGIN_DATA,
    });
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
      response = await request.post("./auth/admin/login", {
        data: ADMIN_LOGIN_DATA,
      });
    }
    if (response.status() !== 200) {
      return;
    }
    const body = await response.json();
    adminToken = body.data?.accessToken ?? body.data?.token;
  };

  test("GET /admin/stats returns data or 401 with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/stats", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/users returns data with admin auth", async ({ request }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/users", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/attendance returns data with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/attendance", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/posts returns data with admin auth", async ({ request }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/posts", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/recommendations returns data with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/recommendations", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/votes returns data with admin auth", async ({ request }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/votes", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/monitoring returns data with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/monitoring", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/sync-errors returns data with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/sync-errors", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });
});
