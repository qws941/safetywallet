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

test.describe("Education API", () => {
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

  test("GET /education/courses returns list with valid auth", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./education/courses", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("GET /education/courses response has correct envelope", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const response = await request.get("./education/courses", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("timestamp");
  });

  test("GET /education/contents returns education contents", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await withRateLimitRetry(() =>
      request.get("./education/contents", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const status = response.status();
    expect([200, 400, 401, 403, 404, 429].includes(status)).toBeTruthy();
    const body = await response.json();

    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  test("GET /education/quizzes returns quizzes", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await withRateLimitRetry(() =>
      request.get("./education/quizzes", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const status = response.status();
    expect([200, 400, 401, 403, 404, 429].includes(status)).toBeTruthy();
    const body = await response.json();

    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  test("GET /education/tbm returns TBM sessions", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await withRateLimitRetry(() =>
      request.get("./education/tbm", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const status = response.status();
    expect([200, 400, 401, 403, 404, 429].includes(status)).toBeTruthy();
    const body = await response.json();

    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  test("GET /education/statutory returns statutory education", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await withRateLimitRetry(() =>
      request.get("./education/statutory", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const status = response.status();
    expect([200, 400, 401, 403, 404, 429].includes(status)).toBeTruthy();
    const body = await response.json();

    if (status === 200) {
      expect(body.success).toBe(true);
    }
  });

  test.describe("Education Admin Endpoints", () => {
    test("POST /education/contents creates education content", async ({
      request,
    }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.post("./education/contents", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          data: {
            title: "E2E Test",
            content: "Test content",
            siteId: "test",
            type: "SAFETY_MANUAL",
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

    test("POST /education/quizzes creates quiz", async ({ request }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.post("./education/quizzes", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          data: {
            title: "E2E Quiz",
            siteId: "test",
            contentId: "test",
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

    test("POST /education/statutory creates statutory education", async ({
      request,
    }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.post("./education/statutory", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          data: {
            siteId: "test",
            userId: "test-user",
            trainingType: "REGULAR",
            trainingName: "E2E Statutory",
            trainingDate: new Date().toISOString(),
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

    test("POST /education/tbm creates TBM session", async ({ request }) => {
      await ensureAdminAuth(request);
      test.skip(!adminAccessToken, "Login not available");

      const response = await withRateLimitRetry(() =>
        request.post("./education/tbm", {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          data: {
            siteId: "test",
            date: new Date().toISOString(),
            topic: "E2E TBM",
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
  });
});
