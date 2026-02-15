import { Hono } from "hono";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock auth middleware
vi.mock("../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

// Mock audit
vi.mock("../../lib/audit", () => ({
  logAuditWithContext: vi.fn(),
}));

import sitesRoute from "../sites";
import type { Env, AuthContext } from "../../types";

function makeAuth(role = "WORKER", userId = "user-1"): AuthContext {
  return {
    user: {
      id: userId,
      name: "Test",
      nameMasked: "Te**",
      phone: "010-0000",
      role,
    },
    loginDate: "2025-01-01",
  };
}

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

function createApp(auth: AuthContext | null, dbMock?: unknown) {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/sites", sitesRoute);

  const env = {
    DB: dbMock ?? {
      prepare: vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        raw: vi.fn().mockResolvedValue([]),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ results: [] }),
      })),
      batch: vi.fn().mockResolvedValue([]),
      exec: vi.fn(),
      dump: vi.fn(),
    },
  } as unknown as Env;

  return { app, env };
}

describe("sites route", () => {
  // ---------- GET / ----------

  describe("GET /", () => {
    it("returns 200 for ADMIN with empty site list", async () => {
      const { app, env } = createApp(makeAuth("ADMIN"));
      const res = await app.request("http://localhost/sites", {}, env);
      expect(res.status).toBe(200);
    });

    it("returns 200 for WORKER with empty membership list", async () => {
      const { app, env } = createApp(makeAuth("WORKER"));
      const res = await app.request("http://localhost/sites", {}, env);
      expect(res.status).toBe(200);
    });
  });

  // ---------- GET /:id ----------

  describe("GET /:id", () => {
    it("returns 404 when site not found", async () => {
      const { app, env } = createApp(makeAuth("ADMIN"));
      const res = await app.request("http://localhost/sites/site-1", {}, env);
      expect(res.status).toBe(404);
    });
  });

  // ---------- POST / ----------

  describe("POST /", () => {
    it("returns 403 for non-ADMIN creating a site", async () => {
      const { app, env } = createApp(makeAuth("WORKER"));
      const res = await app.request(
        "http://localhost/sites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Site" }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 for SITE_ADMIN creating a site", async () => {
      const { app, env } = createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "http://localhost/sites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Site" }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------- PATCH /:id ----------

  describe("PATCH /:id", () => {
    it("returns 403 for WORKER updating site", async () => {
      const { app, env } = createApp(makeAuth("WORKER"));
      const res = await app.request(
        "http://localhost/sites/site-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated" }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /:id/leave ----------

  describe("POST /:id/leave", () => {
    it("returns 404 when membership not found", async () => {
      const { app, env } = createApp(makeAuth("WORKER"));
      const res = await app.request(
        "http://localhost/sites/site-1/leave",
        {
          method: "POST",
        },
        env,
      );
      expect(res.status).toBe(404);
    });
  });
});
