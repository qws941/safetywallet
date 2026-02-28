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
  chain.leftJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
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
    userId: "userId",
    amount: "amount",
    reasonCode: "reasonCode",
    reasonText: "reasonText",
    createdAt: "createdAt",
    siteId: "siteId",
    settleMonth: "settleMonth",
  },
  users: { id: "id", name: "name" },
}));

async function createApp() {
  const { default: distributionsRoute } = await import("../distributions");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("auth", { user: { id: "admin-1", role: "ADMIN" } });
    await next();
  });
  app.route("/admin", distributionsRoute);
  return { app, env: { DB: {} } as Record<string, unknown> };
}

describe("routes/admin/distributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQueue.length = 0;
    mockAllQueue.length = 0;
  });

  it("returns distribution records with summary", async () => {
    mockAllQueue.push([
      {
        userId: "u1",
        userName: "Kim",
        amount: 10,
        reasonCode: "MANUAL_AWARD",
        reasonText: "Manual award",
        createdAt: new Date(),
      },
    ]);
    mockGetQueue.push({ totalAmount: 10, recordCount: 1 });

    const { app, env } = await createApp();
    const res = await app.request(
      "/admin/distributions?month=2026-02&page=1&limit=20",
      {},
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        records: unknown[];
        summary: { totalAmount: number; recordCount: number };
      };
    };
    expect(body.data.records).toHaveLength(1);
    expect(body.data.summary.totalAmount).toBe(10);
    expect(body.data.summary.recordCount).toBe(1);
  });

  it("returns 400 for invalid reasonCode", async () => {
    const { app, env } = await createApp();
    const res = await app.request(
      "/admin/distributions?reasonCode=UNKNOWN",
      {},
      env,
    );
    expect(res.status).toBe(400);
  });
});
