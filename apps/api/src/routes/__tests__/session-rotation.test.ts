import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const mockGet = vi.fn();
const mockInsertValues = vi.fn();

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.from = vi.fn(self);
  chain.where = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.get = mockGet;
  chain.all = vi.fn().mockResolvedValue([]);
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.set = vi.fn(self);
  chain.where = vi.fn(self);
  chain.returning = vi.fn(self);
  chain.get = mockGet;
  chain.run = vi.fn().mockResolvedValue(undefined);
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = mockInsertValues.mockReturnValue(chain);
  chain.run = vi.fn().mockResolvedValue(undefined);
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
  update: vi.fn(() => makeUpdateChain()),
  insert: vi.fn(() => makeInsertChain()),
};

const mockInvalidateCachedUser = vi.fn();

vi.mock("drizzle-orm/d1", () => ({ drizzle: vi.fn(() => mockDb) }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
}));
vi.mock("../../db/schema", () => ({
  users: {
    id: "id",
    role: "role",
    piiViewFull: "piiViewFull",
    phoneEncrypted: "phoneEncrypted",
    refreshToken: "refreshToken",
    refreshTokenExpiresAt: "refreshTokenExpiresAt",
    loginExempt: "loginExempt",
  },
  tokenFamilies: {
    id: "id",
    userId: "userId",
    familyId: "familyId",
    tokenHash: "tokenHash",
    parentTokenId: "parentTokenId",
    used: "used",
    revokedAt: "revokedAt",
    expiresAt: "expiresAt",
  },
  attendance: { userId: "userId", result: "result", checkinAt: "checkinAt" },
  siteMemberships: { userId: "userId", siteId: "siteId", status: "status" },
  sites: { id: "id", active: "active" },
}));
vi.mock("../../lib/crypto", () => ({
  hmac: vi.fn(async (_secret: string, token: string) => `hash:${token}`),
  decrypt: vi.fn(async () => ""),
}));
vi.mock("../../lib/jwt", () => ({
  signJwt: vi.fn(async () => "access-token"),
}));
vi.mock("../../lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("../../lib/session-cache", () => ({
  invalidateCachedUser: (...args: unknown[]) =>
    mockInvalidateCachedUser(...args),
}));
vi.mock("../../lib/fas", () => ({
  fasCheckWorkerAttendance: vi.fn(async () => ({ hasAttendance: true })),
}));
vi.mock("../../lib/logger", () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

describe("session refresh rotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function createApp() {
    const { default: sessionRoute } = await import("../auth/session");
    const app = new Hono();
    app.route("/", sessionRoute);
    return app;
  }

  function makeEnv() {
    return {
      DB: {},
      KV: {},
      HMAC_SECRET: "hmac-secret",
      JWT_SECRET: "jwt-secret",
      ENCRYPTION_KEY: "enc-key",
      REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
    } as Record<string, unknown>;
  }

  it("rotates token family on valid refresh", async () => {
    mockGet
      .mockResolvedValueOnce({
        id: "tf-1",
        userId: "u-1",
        familyId: "fam-1",
        used: false,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({ id: "tf-1" })
      .mockResolvedValueOnce({
        id: "u-1",
        role: "SITE_ADMIN",
        piiViewFull: false,
        phoneEncrypted: null,
      });

    const app = await createApp();
    const res = await app.request(
      "http://localhost/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "rt-1" }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: "fam-1",
        parentTokenId: "tf-1",
        userId: "u-1",
      }),
    );
  });

  it("revokes family on replay detection", async () => {
    mockGet.mockResolvedValueOnce({
      id: "tf-used",
      userId: "u-2",
      familyId: "fam-2",
      used: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const app = await createApp();
    const res = await app.request(
      "http://localhost/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "rt-replay" }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Token reuse detected" });
    expect(mockInvalidateCachedUser).toHaveBeenCalledWith({}, "u-2");
  });

  it("rejects expired token family", async () => {
    mockGet.mockResolvedValueOnce({
      id: "tf-expired",
      userId: "u-3",
      familyId: "fam-3",
      used: false,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const app = await createApp();
    const res = await app.request(
      "http://localhost/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "rt-expired" }),
      },
      makeEnv(),
    );

    expect(res.status).toBe(401);
  });
});
