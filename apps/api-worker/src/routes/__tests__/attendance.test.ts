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

vi.mock("../../middleware/fas-auth", () => ({
  fasAuthMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

vi.mock("../../lib/audit", () => ({
  logAuditWithContext: vi.fn(),
}));

vi.mock("../../lib/logger", () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
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

function makeChain() {
  const promise = Promise.resolve().then(() => mockAll()) as Promise<unknown> &
    Record<string, unknown>;
  const proxy = () => promise;
  promise.from = vi.fn(proxy);
  promise.where = vi.fn(proxy);
  promise.orderBy = vi.fn(proxy);
  promise.limit = vi.fn(proxy);
  promise.offset = vi.fn(proxy);
  promise.get = mockGet;
  promise.all = mockAll;
  return promise;
}

const mockInsert = vi.fn();
const mockBatchChunked = vi.fn();

const mockDb = {
  select: vi.fn(() => makeChain()),
  insert: mockInsert,
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("../../db/helpers", () => ({
  dbBatchChunked: vi.fn(),
}));

vi.mock("../../db/schema", () => ({
  attendance: {
    id: "id",
    siteId: "siteId",
    userId: "userId",
    externalWorkerId: "externalWorkerId",
    result: "result",
    source: "source",
    checkinAt: "checkinAt",
  },
  users: {
    id: "id",
    externalWorkerId: "externalWorkerId",
  },
}));

vi.mock("../../utils/common", () => ({
  getTodayRange: vi.fn(() => ({
    start: new Date("2025-01-01T00:00:00Z"),
    end: new Date("2025-01-02T00:00:00Z"),
  })),
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

async function createApp(auth?: AuthContext) {
  const { default: attendanceRoute } = await import("../attendance");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/attendance", attendanceRoute);
  const env = {
    DB: {},
    KV: { get: vi.fn(), put: vi.fn() },
  } as Record<string, unknown>;
  return { app, env };
}

describe("routes/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /attendance/today", () => {
    it("returns attendance records for today", async () => {
      const records = [
        {
          id: "a1",
          result: "SUCCESS",
          source: "FAS",
          checkinAt: new Date("2025-01-01T08:00:00Z"),
        },
      ];
      mockAll.mockResolvedValue(records);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/attendance/today", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { hasAttendance: boolean; records: unknown[] };
      };
      expect(body.data.hasAttendance).toBe(true);
      expect(body.data.records).toHaveLength(1);
    });

    it("returns hasAttendance=false when no SUCCESS records", async () => {
      mockAll.mockResolvedValue([
        { id: "a1", result: "NOT_FOUND", source: "FAS", checkinAt: new Date() },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/attendance/today", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { hasAttendance: boolean; records: unknown[] };
      };
      expect(body.data.hasAttendance).toBe(false);
    });

    it("returns empty when no records", async () => {
      mockAll.mockResolvedValue([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/attendance/today", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { hasAttendance: boolean; records: unknown[] };
      };
      expect(body.data.hasAttendance).toBe(false);
      expect(body.data.records).toHaveLength(0);
    });
  });

  describe("POST /attendance/sync", () => {
    it("returns 400 for missing events array", async () => {
      const { app, env } = await createApp();
      const res = await app.request(
        "/attendance/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env,
      );
      expect(res.status).toBe(400);
    });
  });
});
