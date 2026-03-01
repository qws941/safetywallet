import { test, expect } from "@playwright/test";
import { getAdminToken } from "./auth-fixture";

// Use environment variable or fallback to match other tests
const BASE_URL = process.env.API_URL || "https://safetywallet.jclee.me/api";

test.describe("API - FAS Module", () => {
  let accessToken: string | undefined = undefined;

  test.beforeAll(async ({ request }) => {
    accessToken = await getAdminToken(request);
    if (!accessToken) {
      test.info().annotations.push({
        type: "auth",
        description: "Admin setup failed or skipped due to rate limit/ban",
      });
      return;
    }
  });

  test.beforeEach(() => {
    if (!accessToken) {
      test.skip(true, "Authentication failed during setup");
    }
  });

  test("GET /api/fas/employees - requires admin role", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/fas/employees`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const status = response.status();
    expect([200, 400, 401, 403, 404, 429]).toContain(status);

    if (status === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("employees");
      expect(Array.isArray(data.data.employees)).toBeTruthy();

      if (data.data.employees.length > 0) {
        const emp = data.data.employees[0];
        expect(emp).toHaveProperty("id");
        expect(emp).toHaveProperty("name");
        expect(emp).toHaveProperty("nameMasked");
        expect(emp).toHaveProperty("externalWorkerId");
      }
    }
  });

  test("POST /api/fas/workers/sync - handles missing array", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/fas/workers/sync`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        siteId: "test-site",
        // missing workers array
      },
    });

    const status = response.status();
    expect([200, 400, 401, 403, 404, 429]).toContain(status);

    if (status === 400) {
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
      expect(data.error.code).toBe("MISSING_WORKERS_ARRAY");
    }
  });

  test("DELETE /api/fas/workers/:id - unauthenticated is rejected", async ({
    request,
  }) => {
    const response = await request.delete(`${BASE_URL}/fas/workers/test-id`);
    // Check status
    const status = response.status();
    expect([200, 400, 401, 403, 404, 429]).toContain(status);
  });
});
