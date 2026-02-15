import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  requireRole,
  requirePermission,
  requireSiteAdmin,
  checkSiteAdmin,
  checkPermission,
} from "../permission";
import type { Env, AuthContext } from "../../types";

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

function createMockD1(...results: Array<Record<string, unknown> | undefined>) {
  const queue = [...results];
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({ results: [] }),
      all: vi.fn().mockResolvedValue({ results: queue.shift() ?? [] }),
      raw: vi.fn().mockResolvedValue([]),
    })),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn(),
    dump: vi.fn(),
  };
}

function makeAuth(role: string, userId = "user-1"): AuthContext {
  return {
    user: {
      id: userId,
      phone: "010-0000-0000",
      role,
      name: "테스트",
      nameMasked: "테*트",
    },
    loginDate: new Date().toISOString().split("T")[0],
  };
}

function makeEnv(dbOverride?: unknown): Env {
  return {
    DB: (dbOverride ?? createMockD1()) as D1Database,
    KV: {} as KVNamespace,
    R2: {} as R2Bucket,
    STATIC: {} as R2Bucket,
    JWT_SECRET: "test",
    HMAC_SECRET: "test",
    ENCRYPTION_KEY: "test",
    ENVIRONMENT: "test",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
    REQUIRE_ATTENDANCE_FOR_POST: "false",
  } as Env;
}

describe("permission middleware", () => {
  // ---------- requireRole ----------

  describe("requireRole", () => {
    function createApp(
      ...roles: Array<"WORKER" | "SITE_ADMIN" | "SUPER_ADMIN" | "SYSTEM">
    ) {
      const app = new Hono<AppEnv>();

      app.use("*", async (c, next) => {
        const authHeader = c.req.header("X-Test-Role");
        if (authHeader) {
          c.set("auth", makeAuth(authHeader));
        }
        await next();
      });

      app.get("/protected", requireRole(...roles), (c) => c.json({ ok: true }));

      return app;
    }

    it("allows matching role", async () => {
      const app = createApp("SITE_ADMIN");
      const env = makeEnv();

      const res = await app.request(
        "http://localhost/protected",
        { headers: { "X-Test-Role": "SITE_ADMIN" } },
        env,
      );

      expect(res.status).toBe(200);
    });

    it("SUPER_ADMIN always passes regardless of required roles", async () => {
      const app = createApp("WORKER");
      const env = makeEnv();

      const res = await app.request(
        "http://localhost/protected",
        { headers: { "X-Test-Role": "SUPER_ADMIN" } },
        env,
      );

      expect(res.status).toBe(200);
    });

    it("denies non-matching role", async () => {
      const app = createApp("SITE_ADMIN");
      const env = makeEnv();

      const res = await app.request(
        "http://localhost/protected",
        { headers: { "X-Test-Role": "WORKER" } },
        env,
      );

      expect(res.status).toBe(403);
    });

    it("returns 401 when no auth set", async () => {
      const app = createApp("SITE_ADMIN");
      const env = makeEnv();

      const res = await app.request("http://localhost/protected", {}, env);

      expect(res.status).toBe(401);
    });

    it("accepts multiple roles", async () => {
      const app = createApp("WORKER", "SITE_ADMIN");
      const env = makeEnv();

      const res1 = await app.request(
        "http://localhost/protected",
        { headers: { "X-Test-Role": "WORKER" } },
        env,
      );
      expect(res1.status).toBe(200);

      const res2 = await app.request(
        "http://localhost/protected",
        { headers: { "X-Test-Role": "SITE_ADMIN" } },
        env,
      );
      expect(res2.status).toBe(200);
    });
  });

  // ---------- requirePermission ----------

  describe("requirePermission", () => {
    function createApp(
      permission:
        | "piiViewFull"
        | "canAwardPoints"
        | "canManageUsers"
        | "canReview"
        | "canExportData",
      dbResult?: Record<string, unknown>,
    ) {
      const mockDb = createMockD1();
      const normalizedResult = dbResult
        ? {
            piiViewFull: dbResult.piiViewFull ?? 0,
            canAwardPoints: dbResult.canAwardPoints ?? 0,
            canManageUsers: dbResult.canManageUsers ?? 0,
            canReview: dbResult.canReview ?? 0,
            canExportData: dbResult.canExportData ?? 0,
          }
        : undefined;

      mockDb.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(normalizedResult ?? null),
        run: vi.fn().mockResolvedValue({ results: [] }),
        all: vi.fn().mockResolvedValue({
          results: normalizedResult ? [normalizedResult] : [],
        }),
        get: vi.fn().mockResolvedValue(normalizedResult ?? null),
        raw: vi
          .fn()
          .mockResolvedValue(
            normalizedResult
              ? [
                  [
                    normalizedResult.piiViewFull,
                    normalizedResult.canAwardPoints,
                    normalizedResult.canManageUsers,
                    normalizedResult.canReview,
                    normalizedResult.canExportData,
                  ],
                ]
              : [],
          ),
      }));

      const app = new Hono<AppEnv>();

      app.use("*", async (c, next) => {
        const authHeader = c.req.header("X-Test-Role");
        if (authHeader) {
          c.set("auth", makeAuth(authHeader));
        }
        await next();
      });

      app.get("/perm", requirePermission(permission), (c) =>
        c.json({ ok: true }),
      );

      return { app, env: makeEnv(mockDb) };
    }

    it("SUPER_ADMIN bypasses permission check", async () => {
      const { app, env } = createApp("canReview");

      const res = await app.request(
        "http://localhost/perm",
        { headers: { "X-Test-Role": "SUPER_ADMIN" } },
        env,
      );

      expect(res.status).toBe(200);
    });

    it("returns 401 when no auth set", async () => {
      const { app, env } = createApp("canReview");

      const res = await app.request("http://localhost/perm", {}, env);

      expect(res.status).toBe(401);
    });

    it("grants access when user has the permission", async () => {
      const { app, env } = createApp("canReview", { canReview: 1 });

      const res = await app.request(
        "http://localhost/perm",
        { headers: { "X-Test-Role": "SITE_ADMIN" } },
        env,
      );

      expect(res.status).toBe(200);
    });

    it("denies access when user lacks the permission", async () => {
      const { app, env } = createApp("canReview", { canReview: 0 });

      const res = await app.request(
        "http://localhost/perm",
        { headers: { "X-Test-Role": "SITE_ADMIN" } },
        env,
      );

      expect(res.status).toBe(403);
    });

    it("returns 404 when user record not found", async () => {
      const { app, env } = createApp("canReview", undefined);

      const res = await app.request(
        "http://localhost/perm",
        { headers: { "X-Test-Role": "WORKER" } },
        env,
      );

      expect(res.status).toBe(404);
    });
  });

  // ---------- requireSiteAdmin ----------

  describe("requireSiteAdmin", () => {
    function createSiteAdminApp(membershipResult?: { role: string }) {
      const mockDb = createMockD1();
      mockDb.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(membershipResult ?? null),
        run: vi.fn().mockResolvedValue({ results: [] }),
        all: vi.fn().mockResolvedValue({
          results: membershipResult ? [membershipResult] : [],
        }),
        get: vi.fn().mockResolvedValue(membershipResult ?? null),
        raw: vi
          .fn()
          .mockResolvedValue(membershipResult ? [[membershipResult.role]] : []),
      }));

      const app = new Hono<AppEnv>();
      app.use("*", async (c, next) => {
        const authHeader = c.req.header("X-Test-Role");
        if (authHeader) {
          c.set("auth", makeAuth(authHeader));
        }
        await next();
      });
      app.get(
        "/site/:siteId/admin",
        requireSiteAdmin((c) => c.req.param("siteId")),
        (c) => c.json({ ok: true }),
      );
      return { app, env: makeEnv(mockDb) };
    }

    it("returns 401 when no auth", async () => {
      const { app, env } = createSiteAdminApp();
      const res = await app.request(
        "http://localhost/site/site-1/admin",
        {},
        env,
      );
      expect(res.status).toBe(401);
    });

    it("SUPER_ADMIN bypasses site admin check", async () => {
      const { app, env } = createSiteAdminApp();
      const res = await app.request(
        "http://localhost/site/site-1/admin",
        { headers: { "X-Test-Role": "SUPER_ADMIN" } },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 when siteId is empty", async () => {
      const mockDb = createMockD1();
      const app = new Hono<AppEnv>();
      app.use("*", async (c, next) => {
        c.set("auth", makeAuth("SITE_ADMIN"));
        await next();
      });
      app.get(
        "/test",
        requireSiteAdmin(() => ""),
        (c) => c.json({ ok: true }),
      );
      const res = await app.request(
        "http://localhost/test",
        {},
        makeEnv(mockDb),
      );
      expect(res.status).toBe(400);
    });

    it("allows when membership is SITE_ADMIN", async () => {
      const { app, env } = createSiteAdminApp({ role: "SITE_ADMIN" });
      const res = await app.request(
        "http://localhost/site/site-1/admin",
        { headers: { "X-Test-Role": "SITE_ADMIN" } },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 403 when membership role is not SITE_ADMIN", async () => {
      const { app, env } = createSiteAdminApp({ role: "WORKER" });
      const res = await app.request(
        "http://localhost/site/site-1/admin",
        { headers: { "X-Test-Role": "WORKER" } },
        env,
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when no membership found", async () => {
      const { app, env } = createSiteAdminApp(undefined);
      const res = await app.request(
        "http://localhost/site/site-1/admin",
        { headers: { "X-Test-Role": "WORKER" } },
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------- checkSiteAdmin ----------

  describe("checkSiteAdmin", () => {
    function makeMockContext(
      role: string | null,
      membershipResult?: { role: string },
    ) {
      const mockDb = createMockD1();
      mockDb.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(membershipResult ?? null),
        run: vi.fn().mockResolvedValue({ results: [] }),
        all: vi.fn().mockResolvedValue({
          results: membershipResult ? [membershipResult] : [],
        }),
        get: vi.fn().mockResolvedValue(membershipResult ?? null),
        raw: vi
          .fn()
          .mockResolvedValue(membershipResult ? [[membershipResult.role]] : []),
      }));

      const env = makeEnv(mockDb);
      const app = new Hono<AppEnv>();
      let result: boolean | null = null;

      app.use("*", async (c, next) => {
        if (role) c.set("auth", makeAuth(role));
        await next();
      });
      app.get("/check", async (c) => {
        result = await checkSiteAdmin(c as never, "site-1");
        return c.json({ result });
      });

      return { app, env, getResult: () => result };
    }

    it("returns false when no auth", async () => {
      const { app, env, getResult } = makeMockContext(null);
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(false);
    });

    it("returns true for SUPER_ADMIN", async () => {
      const { app, env, getResult } = makeMockContext("SUPER_ADMIN");
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(true);
    });

    it("returns true when membership is SITE_ADMIN", async () => {
      const { app, env, getResult } = makeMockContext("SITE_ADMIN", {
        role: "SITE_ADMIN",
      });
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(true);
    });

    it("returns false when membership is WORKER", async () => {
      const { app, env, getResult } = makeMockContext("WORKER", {
        role: "WORKER",
      });
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(false);
    });

    it("returns false when no membership found", async () => {
      const { app, env, getResult } = makeMockContext("WORKER", undefined);
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(false);
    });
  });

  // ---------- checkPermission ----------

  describe("checkPermission", () => {
    function makeMockContext(
      role: string | null,
      permResult?: Record<string, unknown>,
    ) {
      const mockDb = createMockD1();
      const normalizedResult = permResult
        ? {
            piiViewFull: permResult.piiViewFull ?? 0,
            canAwardPoints: permResult.canAwardPoints ?? 0,
            canManageUsers: permResult.canManageUsers ?? 0,
            canReview: permResult.canReview ?? 0,
            canExportData: permResult.canExportData ?? 0,
          }
        : undefined;

      mockDb.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(normalizedResult ?? null),
        run: vi.fn().mockResolvedValue({ results: [] }),
        all: vi.fn().mockResolvedValue({
          results: normalizedResult ? [normalizedResult] : [],
        }),
        get: vi.fn().mockResolvedValue(normalizedResult ?? null),
        raw: vi
          .fn()
          .mockResolvedValue(
            normalizedResult
              ? [
                  [
                    normalizedResult.piiViewFull,
                    normalizedResult.canAwardPoints,
                    normalizedResult.canManageUsers,
                    normalizedResult.canReview,
                    normalizedResult.canExportData,
                  ],
                ]
              : [],
          ),
      }));

      const env = makeEnv(mockDb);
      const app = new Hono<AppEnv>();
      let result: boolean | null = null;

      app.use("*", async (c, next) => {
        if (role) c.set("auth", makeAuth(role));
        await next();
      });
      app.get("/check", async (c) => {
        result = await checkPermission(c as never, "canReview");
        return c.json({ result });
      });

      return { app, env, getResult: () => result };
    }

    it("returns false when no auth", async () => {
      const { app, env, getResult } = makeMockContext(null);
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(false);
    });

    it("returns true for SUPER_ADMIN", async () => {
      const { app, env, getResult } = makeMockContext("SUPER_ADMIN");
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(true);
    });

    it("returns true when user has permission", async () => {
      const { app, env, getResult } = makeMockContext("SITE_ADMIN", {
        canReview: 1,
      });
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(true);
    });

    it("returns false when user lacks permission", async () => {
      const { app, env, getResult } = makeMockContext("SITE_ADMIN", {
        canReview: 0,
      });
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(false);
    });

    it("returns false when user record not found", async () => {
      const { app, env, getResult } = makeMockContext("WORKER", undefined);
      await app.request("http://localhost/check", {}, env);
      expect(getResult()).toBe(false);
    });
  });
});
