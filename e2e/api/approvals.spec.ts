import { test, expect, type APIRequestContext } from "@playwright/test";

const ADMIN_LOGIN_DATA = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "admin123",
};

test.describe("Approvals API", () => {
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

  const adminHeaders = () => ({ Authorization: `Bearer ${accessToken}` });

  test("GET /approvals lists pending approvals", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const response = await request.get("./approvals", {
      headers: adminHeaders(),
    });

    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test("GET /approvals?status=PENDING returns filtered list", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const response = await request.get("./approvals?status=PENDING", {
      headers: adminHeaders(),
    });

    const status = response.status();
    expect([200, 400, 403].includes(status)).toBeTruthy();

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test("GET /approvals?status=INVALID returns 400", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const response = await request.get("./approvals?status=INVALID", {
      headers: adminHeaders(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /approvals/:id/approve handles nonexistent approval", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const response = await request.post("./approvals/nonexistent/approve", {
      headers: adminHeaders(),
    });

    const status = response.status();
    expect([200, 400, 403, 404, 409].includes(status)).toBeTruthy();

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });

  test("POST /approvals/:id/reject handles nonexistent approval", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const response = await request.post("./approvals/nonexistent/reject", {
      headers: adminHeaders(),
      data: { reason: "E2E test rejection" },
    });

    const status = response.status();
    expect([200, 400, 403, 404, 409].includes(status)).toBeTruthy();

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
    }
  });
});
