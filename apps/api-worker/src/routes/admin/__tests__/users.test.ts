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
const mockUpdateSet = vi.fn();
const mockDeleteWhere = vi.fn();
let selectCallCount = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.from = vi.fn(self);
  chain.where = vi.fn(self);
  chain.leftJoin = vi.fn(self);
  chain.innerJoin = vi.fn(self);
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

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.set = mockUpdateSet.mockReturnValue(chain);
  chain.where = vi.fn(self);
  chain.returning = vi.fn(self);
  chain.get = mockGet;
  chain.run = mockRun;
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
  insert: vi.fn(() => makeInsertChain()),
  update: vi.fn(() => makeUpdateChain()),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  gte: vi.fn(),
}));

vi.mock("../../../db/schema", () => ({
  users: {
    id: "id",
    name: "name",
    nameMasked: "nameMasked",
    role: "role",
    phoneHash: "phoneHash",
    phoneEncrypted: "phoneEncrypted",
    dobEncrypted: "dobEncrypted",
    falseReportCount: "falseReportCount",
    restrictedUntil: "restrictedUntil",
    piiViewFull: "piiViewFull",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  auditLogs: {
    id: "id",
    action: "action",
    actorId: "actorId",
    targetType: "targetType",
    targetId: "targetId",
    reason: "reason",
  },
  userRoleEnum: ["WORKER", "ADMIN", "SUPER_ADMIN"],
}));

vi.mock("../../../lib/crypto", () => ({
  decrypt: vi.fn(async () => "decrypted"),
  hmac: vi.fn(async () => "hashed-phone"),
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
  const { default: route } = await import("../users");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", route);
  const env = {
    DB: {},
    KV: { delete: vi.fn() },
    HMAC_SECRET: "secret",
    ENCRYPTION_KEY: "enc-key",
    RATE_LIMITER: null,
  } as Record<string, unknown>;
  return { app, env };
}

describe("admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.insert.mockImplementation(() => makeInsertChain());
    mockDb.update.mockImplementation(() => makeUpdateChain());
  });

  describe("GET /unlock-user/:phoneHash", () => {
    it("unlocks user by phoneHash", async () => {
      mockRun.mockResolvedValue(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/unlock-user/abc123", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { unlocked: boolean } };
      expect(body.data.unlocked).toBe(true);
    });

    it("returns 403 for WORKER", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request("/unlock-user/abc123", {}, env);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /unlock-user-by-phone", () => {
    it("unlocks user by phone number", async () => {
      mockRun.mockResolvedValue(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/unlock-user-by-phone",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "010-1234-5678" }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 for missing phone", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/unlock-user-by-phone",
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

  describe("GET /users", () => {
    it("returns paginated user list", async () => {
      selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        const chain = makeSelectChain();
        if (selectCallCount === 1) {
          mockGet.mockResolvedValueOnce({ piiViewFull: false });
        } else if (selectCallCount === 2) {
          mockAll.mockResolvedValueOnce([
            { id: "u-1", name: "Kim", nameMasked: "K**", role: "WORKER" },
          ]);
        } else {
          mockGet.mockResolvedValueOnce({ count: 1 });
        }
        return chain;
      });
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/users", {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /users/restrictions", () => {
    it("returns restricted users", async () => {
      selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        const chain = makeSelectChain();
        if (selectCallCount === 1) {
          mockAll.mockResolvedValueOnce([
            { id: "u-1", nameMasked: "K**", falseReportCount: 3 },
          ]);
        } else {
          mockGet.mockResolvedValueOnce({ count: 1 });
        }
        return chain;
      });
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/users/restrictions", {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /users/:id/restriction/clear", () => {
    it("clears restriction for user", async () => {
      mockGet.mockResolvedValueOnce({ id: "u-1", falseReportCount: 0 });
      mockRun.mockResolvedValue(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/users/u-1/restriction/clear",
        {
          method: "POST",
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for unknown user", async () => {
      mockGet.mockResolvedValueOnce(null);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/users/unknown/restriction/clear",
        {
          method: "POST",
        },
        env,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /users/:id/role", () => {
    it("changes user role", async () => {
      selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        const chain = makeSelectChain();
        if (selectCallCount === 1) {
          mockGet.mockResolvedValueOnce({ role: "WORKER" });
        }
        return chain;
      });
      mockGet.mockResolvedValueOnce({ id: "u-1", role: "ADMIN" });
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/users/u-1/role",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN" }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 when changing own role", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/users/admin-1/role",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "WORKER" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });
  });
});
