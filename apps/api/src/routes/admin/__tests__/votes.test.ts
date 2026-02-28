import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: AuthContext };
};

vi.mock("../../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

vi.mock("@hono/zod-validator", () => ({
  zValidator: (_target: string, _schema: unknown) => {
    return async (
      c: {
        req: {
          json: () => Promise<unknown>;
          addValidatedData: (target: string, data: unknown) => void;
        };
      },
      next: () => Promise<void>,
    ) => {
      const body = await c.req.json();
      c.req.addValidatedData("json", body);
      await next();
    };
  },
}));

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();
const mockInsertValues = vi.fn();
let selectCallCount = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.from = vi.fn(self);
  chain.where = vi.fn(self);
  chain.leftJoin = vi.fn(self);
  chain.innerJoin = vi.fn(self);
  chain.groupBy = vi.fn(self);
  chain.orderBy = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.offset = vi.fn(self);
  chain.get = mockGet;
  chain.all = mockAll;
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.values = mockInsertValues.mockReturnValue(chain);
  chain.returning = vi.fn(self);
  chain.get = mockGet;
  chain.run = mockRun;
  return chain;
}

function makeDeleteChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.where = vi.fn(self);
  chain.run = mockRun;
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
  insert: vi.fn(() => makeInsertChain()),
  delete: vi.fn(() => makeDeleteChain()),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

const sqlTaggedTemplate = Object.assign(
  (..._args: unknown[]) => ({
    as: () => "voteCount",
  }),
  {
    raw: vi.fn(),
  },
);

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: sqlTaggedTemplate,
}));

vi.mock("../../../db/schema", () => ({
  voteCandidates: {
    id: "id",
    userId: "userId",
    siteId: "siteId",
    month: "month",
    source: "source",
    createdAt: "createdAt",
  },
  votes: {
    id: "id",
    siteId: "siteId",
    month: "month",
    candidateId: "candidateId",
  },
  votePeriods: {
    id: "id",
    siteId: "siteId",
    month: "month",
    startDate: "startDate",
    endDate: "endDate",
  },
  users: {
    id: "id",
    name: "name",
    nameMasked: "nameMasked",
    companyName: "companyName",
    tradeType: "tradeType",
  },
  auditLogs: {
    id: "id",
    action: "action",
    actorId: "actorId",
    targetType: "targetType",
    targetId: "targetId",
    reason: "reason",
  },
  sites: { id: "id", name: "name" },
}));

vi.mock("../../../lib/response", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/response")>(
    "../../../lib/response",
  );
  return actual;
});

vi.mock("../../../lib/audit", () => ({
  logAuditWithContext: vi.fn(),
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

function makeAuth(role = "SUPER_ADMIN"): AuthContext {
  return {
    user: {
      id: "admin-1",
      name: "Admin",
      nameMasked: "Ad**",
      phone: "010-0000",
      role,
    },
    loginDate: "2025-01-01",
  };
}

async function createApp(auth?: AuthContext) {
  const { default: route } = await import("../votes");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", route);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

describe("admin/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.insert.mockImplementation(() => makeInsertChain());
    mockDb.delete.mockImplementation(() => makeDeleteChain());
  });

  describe("GET /votes/candidates", () => {
    it("returns candidates for site and month", async () => {
      mockAll.mockResolvedValueOnce([
        { id: "vc-1", user: { id: "u-1", nameMasked: "K**" } },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/candidates?siteId=site-1&month=2025-01",
        {},
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 when params missing", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/candidates", {}, env);
      expect(res.status).toBe(400);
    });

    it("returns 403 for WORKER", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/votes/candidates?siteId=s&month=2025-01",
        {},
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /votes/candidates", () => {
    it("creates a new candidate", async () => {
      mockGet
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "vc-new", userId: "u-1" });
      mockRun.mockResolvedValue(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/candidates",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u-1",
            siteId: "site-1",
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(201);
    });

    it("returns 409 for duplicate candidate", async () => {
      mockGet.mockResolvedValueOnce({ id: "vc-existing" });
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/candidates",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "u-1",
            siteId: "site-1",
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(409);
    });
  });

  describe("GET /votes/results", () => {
    it("returns vote results as JSON", async () => {
      mockAll.mockResolvedValueOnce([
        { candidateId: "vc-1", candidateName: "K**", voteCount: 5 },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/results?siteId=site-1&month=2025-01",
        {},
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 when params missing", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/results", {}, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid month format", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/results?siteId=site-1&month=invalid",
        {},
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns CSV when format=csv", async () => {
      mockAll.mockResolvedValueOnce([
        { candidateId: "vc-1", candidateName: "K**", voteCount: 5 },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/results?siteId=site-1&month=2025-01&format=csv",
        {},
        env,
      );
      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type") || "";
      expect(contentType).toContain("text/csv");
    });
  });

  describe("DELETE /votes/candidates/:id", () => {
    it("deletes a candidate", async () => {
      mockGet.mockResolvedValueOnce({
        id: "vc-1",
        userId: "u-1",
        month: "2025-01",
      });
      mockRun.mockResolvedValue(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/candidates/vc-1",
        {
          method: "DELETE",
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for unknown candidate", async () => {
      mockGet.mockResolvedValueOnce(null);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes/candidates/unknown",
        {
          method: "DELETE",
        },
        env,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /votes/period/:siteId/:month", () => {
    it("returns vote period", async () => {
      mockGet.mockResolvedValueOnce({
        id: "vp-1",
        siteId: "site-1",
        month: "2025-01",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/period/site-1/2025-01", {}, env);
      expect(res.status).toBe(200);
    });

    it("returns 400 for invalid month", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/period/site-1/bad", {}, env);
      expect(res.status).toBe(400);
    });
  });
});
