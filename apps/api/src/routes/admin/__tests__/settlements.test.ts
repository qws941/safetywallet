import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: { user: { id: string; role: string } } };
};

vi.mock("../helpers", () => ({
  requireManagerOrAdmin: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
  formatYearMonth: vi.fn(() => "2026-02"),
}));

vi.mock("@hono/zod-validator", () => ({
  zValidator: (_target: string, _schema: unknown) => {
    return async (
      c: {
        req: {
          raw: Request;
          addValidatedData: (target: string, data: unknown) => void;
        };
      },
      next: () => Promise<void>,
    ) => {
      const cloned = c.req.raw.clone();
      try {
        const body = await cloned.json();
        c.req.addValidatedData("json", body);
      } catch {
        c.req.addValidatedData("json", {});
      }
      await next();
    };
  },
}));

const mockGetQueue: unknown[] = [];
const mockAllQueue: unknown[] = [];

function dequeueGet() {
  return mockGetQueue.length > 0 ? mockGetQueue.shift() : undefined;
}

function dequeueAll() {
  return mockAllQueue.length > 0 ? mockAllQueue.shift() : [];
}

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.groupBy = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.get = vi.fn(() => dequeueGet());
  chain.all = vi.fn(() => dequeueAll());
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("../../../db/schema", () => ({
  pointsLedger: {
    amount: "amount",
    userId: "userId",
    siteId: "siteId",
    settleMonth: "settleMonth",
    createdAt: "createdAt",
  },
  disputes: {
    id: "id",
    siteId: "siteId",
    userId: "userId",
    type: "type",
    status: "status",
    title: "title",
    description: "description",
    createdAt: "createdAt",
  },
  users: { id: "id", nameMasked: "nameMasked" },
}));

async function createApp(kvGet = vi.fn(), kvPut = vi.fn()) {
  const { default: settlementsRoute } = await import("../settlements");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("auth", { user: { id: "admin-1", role: "ADMIN" } });
    await next();
  });
  app.route("/admin", settlementsRoute);

  const env = {
    DB: {},
    KV: { get: kvGet, put: kvPut },
  } as Record<string, unknown>;
  return { app, env };
}

describe("routes/admin/settlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQueue.length = 0;
    mockAllQueue.length = 0;
  });

  it("returns settlement status", async () => {
    mockGetQueue.push({ totalPoints: 123, userCount: 4 });
    mockGetQueue.push({ disputeCount: 2 });
    const kvGet = vi.fn().mockResolvedValue(null);
    const { app, env } = await createApp(kvGet);

    const res = await app.request(
      "/admin/settlements/status?month=2026-02",
      {},
      env,
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { totalPoints: number; userCount: number; disputeCount: number };
    };
    expect(body.data.totalPoints).toBe(123);
    expect(body.data.userCount).toBe(4);
    expect(body.data.disputeCount).toBe(2);
  });

  it("creates settlement snapshot", async () => {
    mockAllQueue.push([
      { userId: "u1", totalAmount: 50 },
      { userId: "u2", totalAmount: 30 },
    ]);
    const kvGet = vi.fn().mockResolvedValue(null);
    const kvPut = vi.fn().mockResolvedValue(undefined);
    const { app, env } = await createApp(kvGet, kvPut);

    const res = await app.request(
      "/admin/settlements/snapshot",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-02" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { totalPoints: number } };
    expect(body.data.totalPoints).toBe(80);
    expect(kvPut).toHaveBeenCalledTimes(1);
  });

  it("finalizes settlement month", async () => {
    const kvGet = vi.fn().mockResolvedValue(null);
    const kvPut = vi.fn().mockResolvedValue(undefined);
    const { app, env } = await createApp(kvGet, kvPut);

    const res = await app.request(
      "/admin/settlements/finalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-02", confirm: true }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(kvPut).toHaveBeenCalledTimes(1);
  });

  it("returns settlement history", async () => {
    mockAllQueue.push([
      { month: "2026-02", totalPoints: 100, userCount: 3 },
      { month: "2026-01", totalPoints: 120, userCount: 4 },
    ]);
    const kvGet = vi
      .fn()
      .mockResolvedValueOnce('{"finalizedAt":"2026-02-28T15:00:00.000Z"}')
      .mockResolvedValueOnce(null);
    const { app, env } = await createApp(kvGet);

    const res = await app.request(
      "/admin/settlements/history?page=1&limit=20",
      {},
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { history: Array<{ month: string }> };
    };
    expect(body.data.history).toHaveLength(2);
  });

  it("lists settlement disputes", async () => {
    mockAllQueue.push([
      {
        id: "d1",
        siteId: "s1",
        userId: "u1",
        type: "POINT_DISPUTE",
        status: "OPEN",
        title: "Point dispute",
        description: "Details",
        createdAt: new Date(),
        userName: "Kim",
      },
    ]);
    const { app, env } = await createApp();

    const res = await app.request(
      "/admin/settlements/disputes?month=2026-02",
      {},
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { disputes: unknown[] } };
    expect(body.data.disputes).toHaveLength(1);
  });
});
