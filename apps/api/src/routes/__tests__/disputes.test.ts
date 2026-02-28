import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: AuthContext };
};

vi.mock("../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

vi.mock("../../lib/audit", () => ({
  logAuditWithContext: vi.fn(),
}));

vi.mock("../../lib/response", async () => {
  const actual =
    await vi.importActual<typeof import("../../lib/response")>(
      "../../lib/response",
    );
  return actual;
});

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateReturning = vi.fn();

function makeChain() {
  const chain: Record<string, unknown> = {};
  const proxy = (): Record<string, unknown> => chain;
  chain.from = vi.fn(proxy);
  chain.leftJoin = vi.fn(proxy);
  chain.where = vi.fn(proxy);
  chain.orderBy = vi.fn(proxy);
  chain.limit = vi.fn(proxy);
  chain.offset = vi.fn(proxy);
  chain.get = mockGet;
  chain.all = mockAll;
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeChain()),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: mockInsertReturning,
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: mockUpdateReturning,
      })),
    })),
  })),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("../../db/schema", () => ({
  disputes: {
    id: "id",
    siteId: "siteId",
    userId: "userId",
    type: "type",
    status: "status",
    title: "title",
    description: "description",
    refReviewId: "refReviewId",
    refPointsLedgerId: "refPointsLedgerId",
    refAttendanceId: "refAttendanceId",
    resolutionNote: "resolutionNote",
    resolvedAt: "resolvedAt",
    resolvedById: "resolvedById",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  users: { id: "id", name: "name" },
  sites: { id: "id", name: "name" },
  siteMemberships: {
    userId: "userId",
    siteId: "siteId",
    status: "status",
    role: "role",
  },
  disputeStatusEnum: ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"],
  disputeTypeEnum: [
    "REVIEW_APPEAL",
    "POINT_DISPUTE",
    "ATTENDANCE_DISPUTE",
    "OTHER",
  ],
}));

interface AuthContext {
  user: {
    id: string;
    phone: string;
    role: string;
    name: string;
    nameMasked: string;
  };
  loginDate: string;
}

function makeAuth(role = "SUPER_ADMIN", userId = "user-1"): AuthContext {
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

async function createApp(auth?: AuthContext) {
  const { default: disputesRoute } = await import("../disputes");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/disputes", disputesRoute);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

const SITE_ID = "00000000-0000-0000-0000-000000000001";
const DISPUTE_ID = "00000000-0000-0000-0000-000000000099";
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000055";

describe("routes/disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /disputes", () => {
    const validBody = {
      siteId: SITE_ID,
      type: "POINT_DISPUTE" as const,
      title: "Wrong points",
      description: "I should have received more points",
    };

    it("creates dispute for active member", async () => {
      mockGet.mockResolvedValue({
        userId: "user-1",
        siteId: SITE_ID,
        status: "ACTIVE",
      });
      mockInsertReturning.mockReturnValue([
        { id: DISPUTE_ID, ...validBody, userId: "user-1", status: "OPEN" },
      ]);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/disputes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        },
        env,
      );
      expect(res.status).toBe(201);
    });

    it("returns 403 for non-member", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/disputes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        },
        env,
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid body", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/disputes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Missing fields" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /disputes/my", () => {
    it("returns user disputes", async () => {
      mockAll.mockResolvedValue([
        { id: "d1", title: "My dispute", status: "OPEN" },
      ]);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/disputes/my", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { data: unknown[] } };
      expect(body.data.data).toHaveLength(1);
    });

    it("returns empty list when no disputes", async () => {
      mockAll.mockResolvedValue([]);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/disputes/my", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { data: unknown[] } };
      expect(body.data.data).toHaveLength(0);
    });
  });

  describe("GET /disputes/:id", () => {
    it("returns dispute for owner", async () => {
      mockGet.mockResolvedValue({
        id: DISPUTE_ID,
        userId: "user-1",
        siteId: SITE_ID,
        title: "Test",
        status: "OPEN",
      });
      const { app, env } = await createApp(makeAuth("WORKER", "user-1"));
      const res = await app.request(`/disputes/${DISPUTE_ID}`, {}, env);
      expect(res.status).toBe(200);
    });

    it("returns dispute for SUPER_ADMIN even if not owner", async () => {
      mockGet.mockResolvedValue({
        id: DISPUTE_ID,
        userId: "other-user",
        siteId: SITE_ID,
        title: "Test",
        status: "OPEN",
      });
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN", "admin-1"));
      const res = await app.request(`/disputes/${DISPUTE_ID}`, {}, env);
      expect(res.status).toBe(200);
    });

    it("returns 404 when not found", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/disputes/missing", {}, env);
      expect(res.status).toBe(404);
    });

    it("returns 403 for non-owner non-admin", async () => {
      mockGet
        .mockResolvedValueOnce({
          id: DISPUTE_ID,
          userId: "other-user",
          siteId: SITE_ID,
          title: "Test",
          status: "OPEN",
        })
        .mockResolvedValueOnce(null);
      const { app, env } = await createApp(makeAuth("WORKER", "user-1"));
      const res = await app.request(`/disputes/${DISPUTE_ID}`, {}, env);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /disputes/site/:siteId", () => {
    it("returns site disputes for SUPER_ADMIN", async () => {
      mockAll.mockResolvedValue([
        { id: "d1", title: "Dispute 1", status: "OPEN" },
      ]);
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN"));
      const res = await app.request(`/disputes/site/${SITE_ID}`, {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { data: unknown[] } };
      expect(body.data.data).toHaveLength(1);
    });

    it("returns 403 for non-admin worker", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(`/disputes/site/${SITE_ID}`, {}, env);
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /disputes/:id/resolve", () => {
    const resolveBody = {
      status: "RESOLVED" as const,
      resolutionNote: "Fixed the issue",
    };

    it("resolves dispute as SUPER_ADMIN", async () => {
      mockGet.mockResolvedValue({
        id: DISPUTE_ID,
        siteId: SITE_ID,
        status: "OPEN",
      });
      mockUpdateReturning.mockReturnValue([
        {
          id: DISPUTE_ID,
          status: "RESOLVED",
          resolutionNote: "Fixed the issue",
        },
      ]);
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolveBody),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 when dispute not found", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolveBody),
        },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for already resolved dispute", async () => {
      mockGet.mockResolvedValue({
        id: DISPUTE_ID,
        siteId: SITE_ID,
        status: "RESOLVED",
      });
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolveBody),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 for non-admin worker", async () => {
      mockGet
        .mockResolvedValueOnce({
          id: DISPUTE_ID,
          siteId: SITE_ID,
          status: "OPEN",
        })
        .mockResolvedValueOnce(null);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolveBody),
        },
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /disputes/:id/status", () => {
    it("updates status as SUPER_ADMIN", async () => {
      mockGet.mockResolvedValue({
        id: DISPUTE_ID,
        siteId: SITE_ID,
        status: "OPEN",
      });
      mockUpdateReturning.mockReturnValue([
        { id: DISPUTE_ID, status: "IN_REVIEW" },
      ]);
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_REVIEW" }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 when dispute not found", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth("SUPER_ADMIN"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_REVIEW" }),
        },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 for non-admin worker", async () => {
      mockGet
        .mockResolvedValueOnce({
          id: DISPUTE_ID,
          siteId: SITE_ID,
          status: "OPEN",
        })
        .mockResolvedValueOnce(null);
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        `/disputes/${DISPUTE_ID}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_REVIEW" }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });
  });
});
