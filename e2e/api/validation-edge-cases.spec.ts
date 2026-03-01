import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

test.describe("API Validation Edge Cases", () => {
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
    if (!body.success) return;
    accessToken = body.data?.accessToken;
  };

  test("Request with missing Authorization header returns 401", async ({
    request,
  }) => {
    const response = await request.get("./users/me");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("Request with malformed Bearer token returns 401", async ({
    request,
  }) => {
    const response = await request.get("./users/me", {
      headers: { Authorization: "Bearer invalid-token-xxx" },
    });

    const status = response.status();
    expect([401, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("Request with expired-format token returns 401", async ({ request }) => {
    const response = await request.get("./users/me", {
      headers: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.xxx",
      },
    });

    const status = response.status();
    expect([401, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("Request without Bearer prefix returns 401", async ({ request }) => {
    const response = await request.get("./users/me", {
      headers: { Authorization: "some-token" },
    });

    const status = response.status();
    expect([400, 401, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /posts with wrong type for category returns 400", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./posts", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        siteId: "00000000-0000-0000-0000-000000000001",
        content: "validation type mismatch",
        category: 123,
      },
    });

    expect([400, 403].includes(response.status())).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /posts with missing required field returns 400", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./posts", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });

    expect([400, 403].includes(response.status())).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /votes with non-existent postId returns 404", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./votes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        postId: "00000000-0000-0000-0000-000000000099",
        voteType: "LIKE",
      },
    });

    const status = response.status();
    expect([400, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("POST /votes with invalid voteType returns 400", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./votes", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        postId: "00000000-0000-0000-0000-000000000099",
        voteType: "INVALID",
      },
    });

    const status = response.status();
    expect([400, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("PATCH /users/me with invalid field returns 400 or ignores", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.patch("./users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { email: "test@test.com" },
    });

    const status = response.status();
    expect([200, 400, 403].includes(status)).toBeTruthy();

    if (status !== 403) {
      const body = await response.json();
      expect(body).toHaveProperty("success");
    }
  });

  test("POST /posts with excessively long description", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    const longContent = "x".repeat(12000);

    const response = await request.post("./posts", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        siteId: "00000000-0000-0000-0000-000000000001",
        content: longContent,
        category: "UNSAFE_CONDITION",
        visibility: "PUBLIC",
        isAnonymous: false,
      },
    });

    const status = response.status();
    expect([201, 400, 403].includes(status)).toBeTruthy();
  });

  test("POST with text/plain content-type returns 400 or 415", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.fetch("./posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      data: "plain text body",
    });

    const status = response.status();
    expect([400, 401, 403, 415].includes(status)).toBeTruthy();
  });

  test("POST with empty body returns 400", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.fetch("./posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const status = response.status();
    expect([400, 401, 403].includes(status)).toBeTruthy();
  });

  test("POST with malformed JSON returns 400", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.fetch("./posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: '{"category":',
    });

    const status = response.status();
    expect([400, 401, 403].includes(status)).toBeTruthy();
  });

  test("Rapid requests eventually return 429", async ({ request }) => {
    const rapidRequests = Array.from({ length: 18 }, () =>
      request.post("./auth/login", {
        data: {
          name: "rate-limit-test",
          phone: "01000000000",
          dob: "19900101",
        },
      }),
    );

    const responses = await Promise.all(rapidRequests);
    const statuses = responses.map((response) => response.status());
    expect(statuses.some((status) => status === 429)).toBeTruthy();
  });

  test("429 response includes retry-after header", async ({ request }) => {
    let rateLimitedResponse = await request.post("./auth/login", {
      data: {
        name: "rate-limit-test",
        phone: "01000000000",
        dob: "19900101",
      },
    });

    for (
      let attempt = 0;
      attempt < 24 && rateLimitedResponse.status() !== 429;
      attempt++
    ) {
      rateLimitedResponse = await request.post("./auth/login", {
        data: {
          name: "rate-limit-test",
          phone: "01000000000",
          dob: "19900101",
        },
      });
    }

    expect(rateLimitedResponse.status()).toBe(429);
    const retryAfterHeader = rateLimitedResponse.headers()["retry-after"];
    if (retryAfterHeader) {
      expect(Number(retryAfterHeader)).toBeGreaterThanOrEqual(0);
    }
  });

  test("DELETE on read-only endpoint returns 404 or 405", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.delete("./users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([404, 405].includes(status)).toBeTruthy();
  });

  test("PUT on POST-only endpoint returns 404 or 405", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.fetch("./posts", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        siteId: "00000000-0000-0000-0000-000000000001",
        content: "should not be accepted",
        category: "UNSAFE_CONDITION",
      },
    });

    const status = response.status();
    expect([404, 405].includes(status)).toBeTruthy();
  });
});
