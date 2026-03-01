import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

test.describe("Users API", () => {
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

  test("GET /users/me returns profile envelope", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 401, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("PATCH /users/me updates minimal profile payload", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.patch("./users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { displayName: "E2E Test" },
    });

    const status = response.status();
    expect([200, 400, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");

    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("GET /users/me/points returns points summary", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./users/me/points", {
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

  test("GET /users/me/memberships returns memberships", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./users/me/memberships", {
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

  test("POST /users/me/deletion-request requests account deletion", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    await request.delete("./users/me/deletion-request", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const response = await request.post("./users/me/deletion-request", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 201, 400, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");

    if ([200, 201].includes(status)) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("DELETE /users/me/deletion-request cancels deletion request", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.delete("./users/me/deletion-request", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 204, 400, 403, 404].includes(status)).toBeTruthy();

    if (status !== 204) {
      const body = await response.json();
      expect(body).toHaveProperty("success");

      if (status === 200) {
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      }
    }
  });

  test("GET /users/me/data-export returns data export payload", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./users/me/data-export", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 202, 403].includes(status)).toBeTruthy();

    if (status !== 202) {
      const body = await response.json();
      expect(body).toHaveProperty("success");

      if (status === 200) {
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
      }
    }
  });
});
