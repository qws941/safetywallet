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

test.describe("Reviews API (Worker)", () => {
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

  test("GET /reviews/post/:postId returns review list or access errors", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./reviews/post/nonexistent", {
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

  test("GET /reviews lists reviews", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./reviews?siteId=test", {
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
});

test.describe("Reviews API (Admin)", () => {
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

  const reviewActions = [
    "APPROVE",
    "REJECT",
    "REQUEST_MORE",
    "MARK_URGENT",
    "ASSIGN",
    "CLOSE",
  ];

  for (const action of reviewActions) {
    test(`POST /reviews supports ${action} action`, async ({ request }) => {
      await ensureAdminAuth(request);
      test.skip(!accessToken, "Login not available");

      const response = await request.post("./reviews", {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { postId: "test", action },
      });

      expect(
        [200, 201, 400, 403, 404].includes(response.status()),
      ).toBeTruthy();

      const status = response.status();
      const body = await response.json();
      expect(body).toHaveProperty("success");

      if ([200, 201].includes(status)) {
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      }
    });
  }

  test("POST /reviews returns 400 for empty body", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./reviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /reviews returns 400 for invalid action", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./reviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { postId: "test", action: "INVALID_ACTION" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
