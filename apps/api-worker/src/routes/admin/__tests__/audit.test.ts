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

vi.mock("../helpers", () => ({
  requireAdmin: vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
}));

const mockGet = vi.fn();
const mockAll = vi.fn();

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
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("../../../db/schema", () => ({
  auditLogs: {
    action: "action",
    actorId: "actorId",
    createdAt: "createdAt",
  },
  users: { id: "id", nameMasked: "nameMasked" },
}));

vi.mock("../../../lib/response", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/response")>(
    "../../../lib/response",
  );
  return actual;
});

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
  const { default: auditRoute } = await import("../audit");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", auditRoute);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

describe("admin/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => makeChain());
  });

  describe("GET /audit-logs", () => {
    it("returns audit logs with performer info", async () => {
      mockAll.mockResolvedValueOnce([
        {
          log: {
            id: "log-1",
            action: "LOGIN",
            actorId: "u-1",
            createdAt: "2025-01-01",
          },
          performer: { id: "u-1", name: "Test" },
        },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/audit-logs", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { logs: unknown[] } };
      expect(body.data.logs).toHaveLength(1);
    });

    it("returns empty logs", async () => {
      mockAll.mockResolvedValueOnce([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/audit-logs", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { logs: unknown[] } };
      expect(body.data.logs).toHaveLength(0);
    });

    it("accepts limit and offset params", async () => {
      mockAll.mockResolvedValueOnce([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/audit-logs?limit=10&offset=5", {}, env);
      expect(res.status).toBe(200);
    });

    it("accepts action filter param", async () => {
      mockAll.mockResolvedValueOnce([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/audit-logs?action=LOGIN", {}, env);
      expect(res.status).toBe(200);
    });
  });
});
