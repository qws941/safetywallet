import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { AuthContext, Env } from "../../types";

const mockVerifyJwt = vi.fn();
const mockCheckSameDay = vi.fn();
const mockGetCachedUser = vi.fn();
const mockSetCachedUser = vi.fn();
const mockIsRevoked = vi.fn();
const mockLimit = vi.fn();

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.from = vi.fn(self);
  chain.where = vi.fn(self);
  chain.limit = vi.fn((...args: unknown[]) => mockLimit(...args));
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
};

vi.mock("../../lib/jwt", () => ({
  verifyJwt: (...args: unknown[]) => mockVerifyJwt(...args),
  checkSameDay: (...args: unknown[]) => mockCheckSameDay(...args),
}));

vi.mock("../../lib/session-cache", () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  setCachedUser: (...args: unknown[]) => mockSetCachedUser(...args),
}));

vi.mock("../../lib/token-revocation", () => ({
  isRevoked: (...args: unknown[]) => mockIsRevoked(...args),
}));

vi.mock("drizzle-orm/d1", () => ({ drizzle: vi.fn(() => mockDb) }));
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(),
  };
});

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

async function createApp() {
  const { authMiddleware } = await import("../auth");
  const app = new Hono<AppEnv>();
  app.get("/secure", authMiddleware, (c) =>
    c.json({ ok: true, auth: c.get("auth") }),
  );
  return app;
}

function makeEnv(): Env {
  return {
    DB: {} as D1Database,
    KV: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as KVNamespace,
    R2: {} as R2Bucket,
    ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
    JWT_SECRET: "jwt-secret",
    HMAC_SECRET: "hmac-secret",
    ENCRYPTION_KEY: "enc-key",
    ENVIRONMENT: "test",
    REQUIRE_ATTENDANCE_FOR_POST: "false",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
  } as Env;
}

describe("auth middleware TRL and restriction checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyJwt.mockResolvedValue({
      sub: "user-1",
      role: "WORKER",
      phone: "01012345678",
      loginDate: "2026-03-14",
    });
    mockCheckSameDay.mockReturnValue(true);
    mockGetCachedUser.mockResolvedValue(null);
    mockSetCachedUser.mockResolvedValue(undefined);
    mockIsRevoked.mockResolvedValue(false);
    mockLimit.mockResolvedValue([]);
  });

  it("returns 401 when user is in token revocation list", async () => {
    mockIsRevoked.mockResolvedValue(true);

    const app = await createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer token" } },
      makeEnv(),
    );

    expect(res.status).toBe(401);
  });

  it("returns 401 when user is currently restricted", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        name: "Kim",
        nameMasked: "K**",
        restrictedUntil: new Date(Date.now() + 60_000),
      },
    ]);

    const app = await createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer token" } },
      makeEnv(),
    );

    expect(res.status).toBe(401);
  });
});
