import { test, expect, type APIRequestContext } from "@playwright/test";

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "19990308",
};

test.describe("Actions API", () => {
  test.describe.configure({ mode: "serial" });

  let accessToken: string;
  let createdActionId: string | undefined;

  const ensureAuth = async (request: APIRequestContext) => {
    if (accessToken) return;
    let response = await request.post("./auth/login", {
      data: WORKER_LOGIN_DATA,
    });
    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
      response = await request.post("./auth/login", {
        data: WORKER_LOGIN_DATA,
      });
    }
    expect(response.status()).toBe(200);
    const body = await response.json();
    accessToken = body.data.accessToken;
  };

  test("GET /actions returns list with valid auth", async ({ request }) => {
    await ensureAuth(request);
    const response = await request.get("./actions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  test("GET /actions response has correct envelope", async ({ request }) => {
    await ensureAuth(request);
    const response = await request.get("./actions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();
    expect(body).toHaveProperty("success");
    if ("timestamp" in body) {
      expect(body.timestamp).toBeDefined();
    }
  });

  test("POST /actions creates action or returns expected constraints", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./actions", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        postId: "test-post",
        assigneeType: "INDIVIDUAL",
        assigneeId: "test",
        dueDate: "2026-12-31",
        priority: "HIGH",
        description: "E2E test action",
      },
    });

    const status = response.status();
    expect([201, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("timestamp");

    if (status === 201) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      const resourceId = body.data?.id ?? body.data?.action?.id;
      if (typeof resourceId === "string" && resourceId.length > 0) {
        createdActionId = resourceId;
      }
    }
  });

  test("POST /actions with empty body returns 400", async ({ request }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.post("./actions", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("success");
    if ("timestamp" in body) {
      expect(body.timestamp).toBeDefined();
    }
  });

  test("PATCH /actions/:id updates created action when available", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");
    test.skip(
      !createdActionId,
      "No created action id from previous create test",
    );

    const response = await request.patch(`./actions/${createdActionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        status: "IN_PROGRESS",
      },
    });

    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("timestamp");
    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
  });

  test("GET /actions/my returns my actions or expected auth constraints", async ({
    request,
  }) => {
    await ensureAuth(request);
    test.skip(!accessToken, "Login not available");

    const response = await request.get("./actions/my", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = response.status();
    expect([200, 403].includes(status)).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("timestamp");
    if (status === 200) {
      expect(body.data).toBeDefined();
    }
  });
});
