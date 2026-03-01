import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mockFasGetAttendanceTrend = vi.fn();
const DEFAULT_FAS_SOURCE = {
  dbName: "mdidev",
  siteCd: "10",
  d1SiteName: "송도세브란스",
  workerIdPrefix: "",
};
vi.mock("../../../lib/fas", () => ({
  resolveFasSource: vi.fn(() => DEFAULT_FAS_SOURCE),
  fasGetAttendanceTrend: (...args: unknown[]) =>
    mockFasGetAttendanceTrend(...args),
}));

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: AuthContext };
};

vi.mock("../../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

const mockAll = vi.fn();

function makeChain() {
  const chain: Record<string, unknown> = {};
  const proxy = (): Record<string, unknown> => chain;
  chain.from = vi.fn(proxy);
  chain.where = vi.fn(proxy);
  chain.groupBy = vi.fn(proxy);
  chain.orderBy = vi.fn(proxy);
  chain.limit = vi.fn(proxy);
  chain.offset = vi.fn(proxy);
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
  gte: vi.fn(),
  lt: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("../../../db/schema", () => ({
  posts: { createdAt: "createdAt", category: "category", siteId: "siteId" },
  attendance: { checkinAt: "checkinAt", siteId: "siteId" },
  pointsLedger: {
    createdAt: "createdAt",
    siteId: "siteId",
    reasonCode: "reasonCode",
    amount: "amount",
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
  const { default: trendsRoute } = await import("../trends");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", trendsRoute);
  const env = {
    DB: {},
    FAS_HYPERDRIVE: { connectionString: "postgres://test" },
  } as Record<string, unknown>;
  return { app, env };
}

describe("admin/trends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => makeChain());
    mockFasGetAttendanceTrend.mockReset();
    mockFasGetAttendanceTrend.mockResolvedValue([
      { date: "20260220", count: 5 },
      { date: "20260221", count: 3 },
    ]);
  });

  describe("GET /trends/posts", () => {
    it("returns post trends by day and category", async () => {
      mockAll.mockResolvedValueOnce([
        {
          createdAt: new Date("2025-01-15T10:00:00+09:00"),
          category: "UNSAFE_ACT",
        },
        {
          createdAt: new Date("2025-01-15T11:00:00+09:00"),
          category: "UNSAFE_ACT",
        },
        {
          createdAt: new Date("2025-01-16T09:00:00+09:00"),
          category: "GOOD_PRACTICE",
        },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/trends/posts?startDate=2025-01-15&endDate=2025-01-17",
        {},
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { trend: { date: string; category: string; count: number }[] };
      };
      expect(body.data.trend.length).toBeGreaterThan(0);
    });

    it("returns 400 when date range is missing", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/trends/posts", {}, env);
      expect(res.status).toBe(400);
    });

    it("returns 403 for non-admin", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/trends/posts?startDate=2025-01-15&endDate=2025-01-17",
        {},
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /trends/attendance", () => {
    it("returns attendance trends by day", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/trends/attendance?startDate=2025-01-15&endDate=2025-01-17",
        {},
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { trend: { date: string; count: number }[] };
      };
      expect(body.data.trend).toEqual([
        { date: "2026-02-20", count: 5 },
        { date: "2026-02-21", count: 3 },
      ]);
      expect(mockFasGetAttendanceTrend).toHaveBeenCalledWith(
        expect.anything(),
        "20250115",
        "20250118",
        "10",
        DEFAULT_FAS_SOURCE,
      );
    });

    it("returns 400 when date range is missing", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/trends/attendance", {}, env);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /trends/points", () => {
    it("returns points distribution by reason code", async () => {
      mockAll.mockResolvedValueOnce([
        { reasonCode: "REPORT_APPROVED", totalAmount: 100, count: 5 },
        { reasonCode: "DAILY_ATTENDANCE", totalAmount: 50, count: 10 },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/trends/points?startDate=2025-01-15&endDate=2025-01-17",
        {},
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { distribution: { reasonCode: string; count: number }[] };
      };
      expect(body.data.distribution).toHaveLength(2);
    });

    it("returns 400 when date range is missing", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/trends/points", {}, env);
      expect(res.status).toBe(400);
    });
  });
});
