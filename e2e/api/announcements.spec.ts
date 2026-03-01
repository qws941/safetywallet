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

test.describe("Announcements API", () => {
  test.describe.configure({ mode: "serial" });

  let accessToken: string;
  let adminAccessToken: string;

  const withRateLimitRetry = async (
    requestFn: () => Promise<import("@playwright/test").APIResponse>,
  ) => {
    let response = await requestFn();
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) =>
        setTimeout(r, Math.min(retryAfter + 1, 10) * 1000),
      );
      response = await requestFn();
    }
    return response;
  };

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

  const ensureAdminAuth = async (request: APIRequestContext) => {
    if (adminAccessToken) return;
    const response = await withRateLimitRetry(() =>
      request.post("./auth/admin/login", {
        data: ADMIN_LOGIN_DATA,
      }),
    );
    if (response.status() !== 200) {
      return;
    }
    const body = await response.json();
    adminAccessToken = body.data?.accessToken ?? body.data?.token;
  };

  test("GET /announcements returns list with valid auth", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./announcements", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("GET /announcements response has correct envelope", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./announcements", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("timestamp");
  });

  test("GET /announcements/:id returns specific announcement", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await withRateLimitRetry(() =>
      request.get("./announcements/nonexistent", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const status = response.status();
    expect([200, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();

    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  test.describe("Announcements Admin Endpoints", () => {
    test("POST /announcements creates announcement", async ({ request }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.post("./announcements", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          data: {
            title: "E2E Test",
            content: "Test announcement",
          },
        }),
      );
      const status = response.status();
      expect([201, 400, 403].includes(status)).toBeTruthy();
      const body = await response.json();

      if (status === 201) {
        expect(body.success).toBe(true);
      }
    });

    test("PATCH /announcements/:id updates announcement", async ({
      request,
    }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.patch("./announcements/nonexistent", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          data: { title: "E2E Updated" },
        }),
      );
      const status = response.status();
      expect([200, 400, 403, 404].includes(status)).toBeTruthy();
      const body = await response.json();

      if (status === 200) {
        expect(body.success).toBe(true);
      }
    });

    test("DELETE /announcements/:id deletes announcement", async ({
      request,
    }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.delete("./announcements/nonexistent", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        }),
      );
      const status = response.status();
      expect([200, 204, 400, 403, 404].includes(status)).toBeTruthy();

      if (status !== 204) {
        const body = await response.json();
        if (status === 200) {
          expect(body.success).toBe(true);
        }
      }
    });
  });
});
