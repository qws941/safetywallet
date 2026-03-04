import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { AuthContext } from "../../../types";

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: AuthContext };
};

vi.mock("../../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

let selectResults: unknown[] = [];
let insertResult: unknown = undefined;
let updateResult: unknown = undefined;

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.from = vi.fn(self);
  chain.where = vi.fn(self);
  chain.leftJoin = vi.fn(self);
  chain.get = vi.fn(() => selectResults.shift());
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.values = vi.fn(self);
  chain.returning = vi.fn(self);
  chain.get = vi.fn(() => insertResult);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.set = vi.fn(self);
  chain.where = vi.fn(self);
  chain.returning = vi.fn(self);
  chain.get = vi.fn(() => updateResult);
  return chain;
}

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
  };
});

vi.mock("../../../db/schema", async () => {
  const actual =
    await vi.importActual<typeof import("../../../db/schema")>(
      "../../../db/schema",
    );
  return actual;
});

interface MakeAuthArgs {
  role?: AuthContext["user"]["role"];
}

function makeAuth({ role = "WORKER" }: MakeAuthArgs = {}): AuthContext {
  return {
    user: {
      id: "user-1",
      phone: "010-1234-5678",
      role,
      name: "Worker",
      nameMasked: "W****",
    },
    loginDate: "2026-03-01",
  };
}

async function createApp(auth?: AuthContext) {
  const { default: route } = await import("../completions");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/completions", route);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

describe("education/completions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    insertResult = undefined;
    updateResult = undefined;
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.insert.mockImplementation(() => makeInsertChain());
    mockDb.update.mockImplementation(() => makeUpdateChain());
  });

  it("returns 404 when content is missing", async () => {
    selectResults = [undefined];
    const { app, env } = await createApp(makeAuth());
    const res = await app.request(
      "/completions",
      {
        method: "POST",
        body: JSON.stringify({
          contentId: "missing",
          signature: "data:image/png;base64,sig",
        }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("creates completion with signature", async () => {
    selectResults = [
      { id: "c-1", siteId: "site-1" }, // content lookup
      { id: "membership-1" }, // membership
      undefined, // existing completion
    ];
    insertResult = { id: "comp-1", signatureData: "data:image/png" };

    const { app, env } = await createApp(makeAuth());
    const res = await app.request(
      "/completions",
      {
        method: "POST",
        body: JSON.stringify({
          contentId: "c-1",
          signature: "data:image/png;base64,sig",
        }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { completion: unknown } };
    expect(body.data.completion).toBeTruthy();
  });
});
