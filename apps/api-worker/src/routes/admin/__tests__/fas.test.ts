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
          raw: Request;
          addValidatedData: (target: string, data: unknown) => void;
        };
      },
      next: () => Promise<void>,
    ) => {
      const cloned = c.req.raw.clone();
      const body = await cloned.json();
      c.req.addValidatedData("json", body);
      await next();
    };
  },
}));

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();
const mockInsertValues = vi.fn();

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
  chain.all = mockAll;
  chain.run = mockRun;
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(self);
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
  or: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock("../../../db/schema", () => ({
  users: {
    id: "id",
    externalWorkerId: "externalWorkerId",
    phoneHash: "phoneHash",
    phoneEncrypted: "phoneEncrypted",
    dobEncrypted: "dobEncrypted",
    name: "name",
    nameMasked: "nameMasked",
  },
  sites: { id: "id", name: "name" },
  siteMemberships: {
    userId: "userId",
    siteId: "siteId",
    role: "role",
    status: "status",
  },
  auditLogs: {
    id: "id",
    action: "action",
    actorId: "actorId",
    targetType: "targetType",
    targetId: "targetId",
    reason: "reason",
  },
}));

vi.mock("../../../lib/crypto", () => ({
  hmac: vi.fn(async () => "hashed"),
  encrypt: vi.fn(async () => "encrypted"),
}));

vi.mock("../../../lib/response", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/response")>(
    "../../../lib/response",
  );
  return actual;
});

vi.mock("../../../db/helpers", () => ({
  dbBatch: vi.fn(async () => []),
}));

const DEFAULT_FAS_SOURCE = {
  dbName: "mdidev",
  siteCd: "10",
  d1SiteName: "송도세브란스",
  workerIdPrefix: "",
};

vi.mock("../../../lib/fas-mariadb", () => ({
  FAS_SOURCES: [DEFAULT_FAS_SOURCE],
  resolveFasSource: vi.fn(() => DEFAULT_FAS_SOURCE),
  fasSearchEmployeeByPhone: vi.fn(async () => null),
  fasSearchEmployeeByName: vi.fn(async () => []),
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
  const { default: route } = await import("../fas");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", route);
  const env = {
    DB: {},
    HMAC_SECRET: "secret",
    ENCRYPTION_KEY: "enc-key",
    FAS_HYPERDRIVE: null,
  } as Record<string, unknown>;
  return { app, env };
}

describe("admin/fas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.insert.mockImplementation(() => makeInsertChain());
    mockDb.update.mockImplementation(() => makeUpdateChain());
  });

  describe("POST /fas/sync-workers", () => {
    it("syncs workers successfully", async () => {
      mockGet.mockResolvedValueOnce({ id: "site-1", name: "Severance" });
      mockAll.mockResolvedValueOnce([]);
      mockAll.mockResolvedValueOnce([]);
      mockRun.mockResolvedValue(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/fas/sync-workers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: "site-1",
            workers: [
              {
                externalWorkerId: "EXT-001",
                name: "Kim",
                phone: "010-1234-5678",
                dob: "1990-01-01",
              },
            ],
          }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for unknown site", async () => {
      mockGet.mockResolvedValueOnce(null);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/fas/sync-workers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: "unknown-site",
            workers: [],
          }),
        },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 for WORKER", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/fas/sync-workers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: "site-1",
            workers: [],
          }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /fas/search-mariadb", () => {
    it("returns error when no query param", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/fas/search-mariadb", {}, env);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code: string } };
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("returns error when FAS_HYPERDRIVE not configured", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/fas/search-mariadb?name=Kim", {}, env);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code: string } };
      expect(body.error?.code).toBe("SERVICE_UNAVAILABLE");
    });
  });
});
