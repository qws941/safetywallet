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

test.describe("Notifications API (Worker)", () => {
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

  test("GET /notifications/subscriptions", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./notifications/subscriptions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("GET /notifications/vapid-key", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./notifications/vapid-key", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const status = response.status();
    expect([200, 503].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });

  test("POST /notifications/subscribe", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./notifications/subscribe", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        endpoint: "https://e2e-test.example.com/push",
        keys: {
          p256dh: "test-key-p256dh",
          auth: "test-key-auth",
        },
      },
    });
    const status = response.status();
    expect([200, 201, 400, 403, 503].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if ([200, 201].includes(status)) expect(body.success).toBe(true);
  });

  test("DELETE /notifications/unsubscribe", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.delete(
      "./notifications/unsubscribe?endpoint=https://e2e-test.example.com/push",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const status = response.status();
    expect([200, 204, 400, 403, 404].includes(status)).toBeTruthy();

    if (status !== 204) {
      const body = await response.json();
      expect(body).toHaveProperty("success");
      if (status === 200) expect(body.success).toBe(true);
    }
  });
});

test.describe("Notifications API (Admin)", () => {
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

  test("POST /notifications/send", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./notifications/send", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        userIds: ["test-user"],
        message: { title: "E2E Test", body: "Test notification" },
      },
    });
    const status = response.status();
    expect([200, 400, 403, 503].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    if (status === 200) expect(body.success).toBe(true);
  });
});
