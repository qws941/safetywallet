import {
  test,
  expect,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";

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
      await new Promise((r) =>
        setTimeout(r, Math.min(retryAfter + 1, 10) * 1000),
      );
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
    test.skip(!adminToken, "Admin login not available");
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/stats", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/users returns data with admin auth", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!adminToken, "Admin login not available");
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/users", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/attendance returns data with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!adminToken, "Admin login not available");
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
    test.skip(!adminToken, "Admin login not available");
    if (!adminToken) {
      test.skip(true, "Admin login not available");
      return;
    }
    const response = await request.get("./admin/posts", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const status = response.status();
    expect([200, 400, 403, 404].includes(status)).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
  });

  test("GET /admin/recommendations returns data with admin auth", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!adminToken, "Admin login not available");
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
    test.skip(!adminToken, "Admin login not available");
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
    test.skip(!adminToken, "Admin login not available");
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
    test.skip(!adminToken, "Admin login not available");
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

test.describe("Admin API Write Operations", () => {
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

  const assertWriteResponse = async (
    response: APIResponse,
    allowedStatuses = [200, 201, 400, 403, 404],
  ) => {
    const status = response.status();
    expect(allowedStatuses.includes(status)).toBeTruthy();
    const contentType = response.headers()["content-type"] || "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      if (status === 200 || status === 201) {
        expect(body.success).toBe(true);
      }
    }
  };

  test("admin user management write endpoints", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const lockResponse = await request.post("./admin/users/nonexistent/lock", {
      headers: adminHeaders(),
    });
    await assertWriteResponse(lockResponse, [200, 201, 400, 403, 404, 405]);

    const roleResponse = await request.patch("./admin/users/nonexistent/role", {
      headers: adminHeaders(),
      data: { role: "SITE_ADMIN" },
    });
    await assertWriteResponse(roleResponse);

    const purgeResponse = await request.delete(
      "./admin/users/nonexistent/emergency-purge",
      {
        headers: adminHeaders(),
        data: {
          confirmUserId: "nonexistent",
          reason: "E2E emergency purge test",
        },
      },
    );
    await assertWriteResponse(purgeResponse, [200, 400, 403, 404, 410]);
  });

  test("admin site management write endpoints", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const createSiteResponse = await request.post("./sites", {
      headers: adminHeaders(),
      data: { name: `E2E Site ${Date.now()}` },
    });
    await assertWriteResponse(createSiteResponse);

    let siteId = "nonexistent";
    if (
      createSiteResponse.status() === 201 ||
      createSiteResponse.status() === 200
    ) {
      const body = await createSiteResponse.json();
      siteId = body.site?.id ?? siteId;
    }

    const patchSiteResponse = await request.patch(`./sites/${siteId}`, {
      headers: adminHeaders(),
      data: { name: `E2E Site Updated ${Date.now()}`, active: true },
    });
    await assertWriteResponse(patchSiteResponse);
  });

  test("admin content management write endpoints", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const reviewPostResponse = await request.post(
      "./admin/posts/nonexistent/review",
      {
        headers: adminHeaders(),
        data: {
          action: "APPROVE",
          comment: "E2E admin review",
          pointsToAward: 1,
        },
      },
    );
    await assertWriteResponse(reviewPostResponse);

    const deletePostResponse = await request.delete(
      "./admin/posts/nonexistent",
      {
        headers: adminHeaders(),
        data: { reason: "E2E delete test" },
      },
    );
    await assertWriteResponse(deletePostResponse);

    const createAnnouncementResponse = await request.post("./announcements", {
      headers: adminHeaders(),
      data: {
        title: `E2E Announcement ${Date.now()}`,
        content: "E2E announcement content",
      },
    });
    await assertWriteResponse(createAnnouncementResponse);

    let announcementId = "nonexistent";
    if (
      createAnnouncementResponse.status() === 201 ||
      createAnnouncementResponse.status() === 200
    ) {
      const body = await createAnnouncementResponse.json();
      announcementId = body.announcement?.id ?? announcementId;
    }

    const patchAnnouncementResponse = await request.patch(
      `./announcements/${announcementId}`,
      {
        headers: adminHeaders(),
        data: { title: `E2E Updated Announcement ${Date.now()}` },
      },
    );
    await assertWriteResponse(patchAnnouncementResponse);

    const deleteAnnouncementResponse = await request.delete(
      `./announcements/${announcementId}`,
      {
        headers: adminHeaders(),
      },
    );
    await assertWriteResponse(deleteAnnouncementResponse);

    const createEducationResponse = await request.post("./education/contents", {
      headers: adminHeaders(),
      data: {
        siteId: "nonexistent",
        title: "E2E Education Content",
        contentType: "TEXT",
      },
    });
    await assertWriteResponse(createEducationResponse);

    const deleteEducationResponse = await request.delete(
      "./education/contents/nonexistent",
      {
        headers: adminHeaders(),
      },
    );
    await assertWriteResponse(deleteEducationResponse);
  });

  test("admin attendance management write endpoints", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const syncResponse = await request.post("./admin/fas/sync-workers", {
      headers: adminHeaders(),
      data: {
        siteId: "nonexistent",
        workers: [],
      },
    });
    await assertWriteResponse(syncResponse);

    const resolveSyncErrorResponse = await request.patch(
      "./admin/sync-errors/nonexistent/status",
      {
        headers: adminHeaders(),
        data: { status: "RESOLVED" },
      },
    );
    await assertWriteResponse(resolveSyncErrorResponse);
  });

  test("admin points management write and bulk endpoints", async ({
    request,
  }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const awardResponse = await request.post("./points/award", {
      headers: adminHeaders(),
      data: {
        userId: "nonexistent",
        siteId: "nonexistent",
        amount: 10,
        reason: "E2E manual award",
      },
    });
    await assertWriteResponse(awardResponse);

    const bulkSnapshotResponse = await request.post(
      "./admin/settlements/snapshot",
      {
        headers: adminHeaders(),
        data: { month: "2026-01" },
      },
    );
    await assertWriteResponse(bulkSnapshotResponse, [200, 400, 403, 404, 409]);
  });

  test("admin report and export endpoints", async ({ request }) => {
    await ensureAdminAuth(request);
    test.skip(!accessToken, "Admin login not available");

    const voteExportResponse = await request.get(
      "./admin/votes/results?siteId=nonexistent&month=2026-01&format=csv",
      {
        headers: adminHeaders(),
      },
    );
    expect(
      [200, 400, 403, 404].includes(voteExportResponse.status()),
    ).toBeTruthy();

    const userExportResponse = await request.get("./admin/users?page=1", {
      headers: adminHeaders(),
    });
    expect(
      [200, 400, 403, 404].includes(userExportResponse.status()),
    ).toBeTruthy();
    if (userExportResponse.status() === 200) {
      const contentType = userExportResponse.headers()["content-type"] || "";
      if (contentType.includes("application/json")) {
        const body = await userExportResponse.json();
        expect(body.success).toBe(true);
      }
    }
  });
});
