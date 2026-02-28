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

let selectResult: unknown = [];

function makeChain(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(selectResult);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
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
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("../../../db/schema", () => ({
  apiMetrics: {
    bucket: "bucket",
    endpoint: "endpoint",
    method: "method",
    requestCount: "requestCount",
    errorCount: "errorCount",
    totalDurationMs: "totalDurationMs",
    maxDurationMs: "maxDurationMs",
    status2xx: "status2xx",
    status4xx: "status4xx",
    status5xx: "status5xx",
  },
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
  const { default: monitoringRoute } = await import("../monitoring");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", monitoringRoute);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

describe("admin/monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    mockDb.select.mockImplementation(() => makeChain());
  });

  describe("GET /monitoring/metrics", () => {
    it("returns metrics grouped by bucket (default)", async () => {
      selectResult = [{ bucket: "2025-01-01T00:00", totalRequests: 100 }];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/monitoring/metrics", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { groupBy: string; rows: unknown[] };
      };
      expect(body.data.groupBy).toBe("bucket");
      expect(body.data.rows).toHaveLength(1);
    });

    it("returns metrics grouped by endpoint", async () => {
      selectResult = [
        { endpoint: "/api/posts", method: "GET", totalRequests: 50 },
      ];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/monitoring/metrics?groupBy=endpoint",
        {},
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { groupBy: string } };
      expect(body.data.groupBy).toBe("endpoint");
    });

    it("returns 403 for non-admin", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/monitoring/metrics", {}, env);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /monitoring/top-errors", () => {
    it("returns top error endpoints", async () => {
      selectResult = [
        { endpoint: "/api/auth", method: "POST", totalErrors: 5 },
      ];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/monitoring/top-errors", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { rows: unknown[] } };
      expect(body.data.rows).toHaveLength(1);
    });

    it("returns 403 for non-admin", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/monitoring/top-errors", {}, env);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /monitoring/summary", () => {
    it("returns health summary", async () => {
      selectResult = [
        {
          totalRequests: 1000,
          totalErrors: 10,
          avgDurationMs: 45.5,
          maxDurationMs: 200,
          total2xx: 950,
          total4xx: 40,
          total5xx: 10,
        },
      ];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/monitoring/summary", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: {
          totalRequests: number;
          errorRate: number;
          statusBreakdown: { "2xx": number; "4xx": number; "5xx": number };
        };
      };
      expect(body.data.totalRequests).toBe(1000);
      expect(body.data.errorRate).toBe(1);
      expect(body.data.statusBreakdown["2xx"]).toBe(950);
    });

    it("handles empty metrics gracefully", async () => {
      selectResult = [undefined];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/monitoring/summary?minutes=30", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { totalRequests: number; errorRate: number };
      };
      expect(body.data.totalRequests).toBe(0);
      expect(body.data.errorRate).toBe(0);
    });

    it("returns 403 for non-admin", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/monitoring/summary", {}, env);
      expect(res.status).toBe(403);
    });
  });
});
