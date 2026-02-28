import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { verifyPassword } from "../../lib/crypto";
import { checkRateLimit } from "../../lib/rate-limit";
import {
  checkDeviceRegistrationLimit,
  recordDeviceRegistration,
} from "../../lib/device-registrations";
import {
  fasSearchEmployeeByPhone,
  fasCheckWorkerAttendance,
} from "../../lib/fas-mariadb";
import { syncSingleFasEmployee, socialNoToDob } from "../../lib/fas-sync";
import { logAuditWithContext } from "../../lib/audit";
import { signJwt } from "../../lib/jwt";

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: AuthContext };
};

vi.mock("../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

vi.mock("../../middleware/rate-limit", () => ({
  authRateLimitMiddleware: () =>
    vi.fn(async (_c: unknown, next: () => Promise<void>) => next()),
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

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();
const mockInsertValues = vi.fn();
const mockLimit = vi.fn();

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.from = vi.fn(self);
  chain.where = vi.fn(self);
  chain.leftJoin = vi.fn(self);
  chain.innerJoin = vi.fn(self);
  chain.orderBy = vi.fn(self);
  chain.limit = vi.fn((...args: unknown[]) => mockLimit(...args));
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
  chain.onConflictDoNothing = vi.fn(self);
  chain.get = mockGet;
  chain.run = mockRun;
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.set = vi.fn(() => chain);
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
  isNull: vi.fn(),
  desc: vi.fn(),
}));

vi.mock("../../db/schema", () => ({
  users: {
    id: "id",
    name: "name",
    nameMasked: "nameMasked",
    phone: "phone",
    phoneHash: "phoneHash",
    phoneEncrypted: "phoneEncrypted",
    dobHash: "dobHash",
    dobEncrypted: "dobEncrypted",
    role: "role",
    refreshToken: "refreshToken",
    refreshTokenExpiresAt: "refreshTokenExpiresAt",
    piiViewFull: "piiViewFull",
    canAwardPoints: "canAwardPoints",
    canManageUsers: "canManageUsers",
    externalSystem: "externalSystem",
    externalWorkerId: "externalWorkerId",
    deletedAt: "deletedAt",
  },
  attendance: {
    id: "id",
    userId: "userId",
    result: "result",
    checkinAt: "checkinAt",
  },
  siteMemberships: {
    userId: "userId",
    siteId: "siteId",
    role: "role",
    status: "status",
    joinedAt: "joinedAt",
  },
  auditLogs: { id: "id", action: "action", actorId: "actorId" },
  deviceRegistrations: { id: "id", userId: "userId", deviceId: "deviceId" },
  sites: { id: "id", active: "active" },
}));

vi.mock("../../lib/crypto", () => ({
  hmac: vi.fn(async () => "hashed"),
  encrypt: vi.fn(async () => "encrypted"),
  decrypt: vi.fn(async () => "01012345678"),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock("../../lib/jwt", () => ({
  signJwt: vi.fn(async () => "mock-jwt-token"),
}));

vi.mock("../../lib/audit", () => ({
  logAuditWithContext: vi.fn(),
}));

vi.mock("../../lib/response", async () => {
  const actual =
    await vi.importActual<typeof import("../../lib/response")>(
      "../../lib/response",
    );
  return actual;
});

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

vi.mock("../../lib/fas-mariadb", () => ({
  fasSearchEmployeeByPhone: vi.fn(async () => null),
  fasCheckWorkerAttendance: vi.fn(async () => ({ hasAttendance: false })),
  fasGetEmployeeInfo: vi.fn(async () => null),
}));

vi.mock("../../lib/fas-sync", () => ({
  syncSingleFasEmployee: vi.fn(async () => null),
  socialNoToDob: vi.fn(() => null),
}));

vi.mock("../../lib/device-registrations", () => ({
  checkDeviceRegistrationLimit: vi.fn(async () => ({ allowed: true })),
  normalizeDeviceId: vi.fn((id: unknown) => id || null),
  recordDeviceRegistration: vi.fn(),
}));

vi.mock("../../lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("../../utils/common", () => ({
  getTodayRange: () => ({
    start: "2025-01-01T00:00:00Z",
    end: "2025-01-02T00:00:00Z",
  }),
  maskName: (name: string) =>
    name.length > 1 ? name[0] + "*".repeat(name.length - 1) : name,
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

function makeAuth(role = "WORKER"): AuthContext {
  return {
    user: {
      id: "user-1",
      name: "Kim",
      nameMasked: "K**",
      phone: "010-1234",
      role,
    },
    loginDate: "2025-01-01",
  };
}

async function createApp(
  auth?: AuthContext,
  envOverrides?: Partial<Record<string, unknown>>,
) {
  const { default: route } = await import("../auth");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", route);
  const env = {
    DB: {},
    KV: { get: vi.fn(async () => null), put: vi.fn(), delete: vi.fn() },
    HMAC_SECRET: "secret",
    ENCRYPTION_KEY: "enc-key",
    JWT_SECRET: "jwt-secret",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "password123",
    ADMIN_PASSWORD_HASH: "pbkdf2:100000:dGVzdA==:dGVzdA==",
    ...envOverrides,
  } as Record<string, unknown>;
  return { app, env };
}

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.insert.mockImplementation(() => makeInsertChain());
    mockDb.update.mockImplementation(() => makeUpdateChain());
    mockLimit.mockReturnValue([]);
  });

  describe("POST /register", () => {
    it("returns 400 for missing fields", async () => {
      const { app, env } = await createApp();
      const res = await app.request(
        "/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Kim" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 409 for existing user", async () => {
      mockGet.mockResolvedValueOnce({
        id: "existing-user",
        phoneEncrypted: "enc",
        dobEncrypted: "enc",
      });
      const { app, env } = await createApp();
      const res = await app.request(
        "/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "1990-01-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(409);
    });

    it("creates a new user successfully", async () => {
      mockGet.mockResolvedValueOnce(null);
      mockGet.mockResolvedValueOnce({ id: "new-user-id" });
      const { app, env } = await createApp();
      const res = await app.request(
        "/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "1990-01-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(201);
    });

    it("returns 429 when device registration limit is exceeded", async () => {
      vi.mocked(checkDeviceRegistrationLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: 0,
        recent: [],
      } as any);

      const { app, env } = await createApp();
      const res = await app.request(
        "/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "device-id": "dev-1",
          },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(429);
    });

    it("backfills encrypted fields for existing user and returns conflict", async () => {
      mockGet.mockResolvedValueOnce({
        id: "existing-user",
        phoneEncrypted: null,
        dobEncrypted: null,
      });

      const { app, env } = await createApp();
      const res = await app.request(
        "/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(409);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("records device registration for new user when device id is present", async () => {
      mockGet.mockResolvedValueOnce(null);
      mockGet.mockResolvedValueOnce({ id: "new-user-id" });
      mockGet.mockResolvedValueOnce(null);

      const { app, env } = await createApp();
      const res = await app.request(
        "/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": "device-abc",
            "User-Agent": "vitest-agent",
          },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(201);
      expect(recordDeviceRegistration).toHaveBeenCalled();
    });
  });

  describe("POST /login", () => {
    it("returns 429 when login IP rate limit is exceeded", async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: 0,
        recent: [],
      } as any);
      const { app, env } = await createApp();
      const res = await app.request(
        "/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "1.2.3.4",
          },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(429);
    });

    it("returns 429 when account is currently locked", async () => {
      const now = Date.now();
      const { app, env } = await createApp(undefined, {
        KV: {
          get: vi
            .fn()
            .mockResolvedValueOnce(
              JSON.stringify({ attempts: 5, lockedUntil: now + 60_000 }),
            ),
          put: vi.fn(),
          delete: vi.fn(),
        },
      });

      const res = await app.request(
        "/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(429);
    });

    it("returns 401 for name mismatch", async () => {
      mockLimit.mockReturnValueOnce([
        {
          id: "user-1",
          name: "Park",
          role: "WORKER",
          piiViewFull: false,
          phoneEncrypted: null,
        },
      ]);

      const { app, env } = await createApp();
      const res = await app.request(
        "/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(401);
    });

    it("returns 403 when attendance is required and missing", async () => {
      mockLimit
        .mockReturnValueOnce([
          {
            id: "user-1",
            name: "Kim",
            role: "WORKER",
            piiViewFull: false,
            externalWorkerId: null,
          },
        ])
        .mockReturnValueOnce([]);

      const { app, env } = await createApp(undefined, {
        REQUIRE_ATTENDANCE_FOR_LOGIN: "true",
      });

      const res = await app.request(
        "/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(403);
    });

    it("logs in successfully and clears login attempt key", async () => {
      mockLimit.mockReturnValueOnce([
        {
          id: "user-1",
          name: "Kim",
          nameMasked: "K**",
          role: "WORKER",
          piiViewFull: true,
          phoneEncrypted: "enc-phone",
          externalWorkerId: null,
        },
      ]);
      const kvDelete = vi.fn();
      const { app, env } = await createApp(undefined, {
        KV: {
          get: vi.fn().mockResolvedValueOnce(null),
          put: vi.fn(),
          delete: kvDelete,
        },
      });

      const res = await app.request(
        "/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": "login-device",
          },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "19900101",
          }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(signJwt).toHaveBeenCalled();
      expect(kvDelete).toHaveBeenCalled();
      expect(logAuditWithContext).toHaveBeenCalled();
    });

    it("uses FAS lookup when hyperdrive is available", async () => {
      vi.mocked(fasSearchEmployeeByPhone).mockResolvedValueOnce({
        socialNo: "7104101",
      } as any);
      vi.mocked(socialNoToDob).mockReturnValueOnce("19710410");
      vi.mocked(syncSingleFasEmployee).mockResolvedValueOnce({
        id: "user-1",
        name: "Kim",
        nameMasked: "K**",
        role: "WORKER",
        piiViewFull: false,
      } as never);

      const { app, env } = await createApp(undefined, {
        FAS_HYPERDRIVE: {},
      });
      const res = await app.request(
        "/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Kim",
            phone: "010-1234-5678",
            dob: "710410",
          }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(fasCheckWorkerAttendance).not.toHaveBeenCalled();
    });
  });

  describe("POST /refresh", () => {
    it("returns 400 for missing refreshToken", async () => {
      const { app, env } = await createApp();
      const res = await app.request(
        "/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 for invalid refresh token", async () => {
      mockLimit.mockReturnValue([]);
      const { app, env } = await createApp();
      const res = await app.request(
        "/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "invalid-token" }),
        },
        env,
      );
      expect(res.status).toBe(401);
    });

    it("returns 429 when refresh endpoint is rate limited", async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: 0,
        recent: [],
      } as any);

      const { app, env } = await createApp();
      const res = await app.request(
        "/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "token" }),
        },
        env,
      );

      expect(res.status).toBe(429);
    });

    it("returns 401 and clears token when refresh token is expired", async () => {
      mockLimit.mockReturnValueOnce([
        {
          id: "user-1",
          role: "WORKER",
          refreshTokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
        },
      ]);

      const { app, env } = await createApp();
      const res = await app.request(
        "/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "expired-token" }),
        },
        env,
      );

      expect(res.status).toBe(401);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("returns 403 when worker refresh has no attendance", async () => {
      mockLimit
        .mockReturnValueOnce([
          {
            id: "user-1",
            role: "WORKER",
            refreshTokenExpiresAt: null,
            externalWorkerId: null,
            piiViewFull: false,
            phoneEncrypted: null,
          },
        ])
        .mockReturnValueOnce([]);

      const { app, env } = await createApp(undefined, {
        REQUIRE_ATTENDANCE_FOR_LOGIN: "true",
      });

      const res = await app.request(
        "/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "token" }),
        },
        env,
      );

      expect(res.status).toBe(403);
    });

    it("refreshes token successfully", async () => {
      mockLimit.mockReturnValueOnce([
        {
          id: "user-1",
          role: "ADMIN",
          refreshTokenExpiresAt: null,
          piiViewFull: true,
          phoneEncrypted: "encrypted-phone",
        },
      ]);

      const { app, env } = await createApp();
      const res = await app.request(
        "/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "good-token" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(signJwt).toHaveBeenCalled();
    });
  });

  describe("POST /logout", () => {
    it("returns 400 for missing refreshToken", async () => {
      const { app, env } = await createApp();
      const res = await app.request(
        "/logout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("logs out successfully", async () => {
      mockRun.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp();
      const res = await app.request(
        "/logout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "valid-token" }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });
  });

  describe("POST /admin/login", () => {
    it("returns 400 for missing fields", async () => {
      const { app, env } = await createApp();
      const res = await app.request(
        "/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 for invalid credentials", async () => {
      const { app, env } = await createApp();
      const res = await app.request(
        "/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "wrong" }),
        },
        env,
      );
      expect(res.status).toBe(401);
    });

    it("succeeds with correct credentials", async () => {
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      mockGet.mockResolvedValueOnce({
        id: "admin-1",
        name: "관리자",
        nameMasked: "관*자",
        role: "SUPER_ADMIN",
        piiViewFull: true,
      });
      mockRun.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp();
      const res = await app.request(
        "/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "password123" }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("rejects login when ADMIN_PASSWORD_HASH is not set", async () => {
      const { app, env } = await createApp(undefined, {
        ADMIN_PASSWORD_HASH: undefined,
      });
      const res = await app.request(
        "/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "password123" }),
        },
        env,
      );
      expect(res.status).toBe(500);
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it("returns 429 when admin login IP is rate limited", async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: 0,
        recent: [],
      } as any);
      const { app, env } = await createApp();
      const res = await app.request(
        "/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "password123" }),
        },
        env,
      );
      expect(res.status).toBe(429);
    });

    it("creates admin user when no super admin exists", async () => {
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      mockGet.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: "admin-created",
        nameMasked: "관*자",
        role: "SUPER_ADMIN",
      });

      const { app, env } = await createApp();
      const res = await app.request(
        "/admin/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "password123" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("GET /me", () => {
    it("throws 401 when auth context is missing", async () => {
      const { app, env } = await createApp();
      const res = await app.request("/me", {}, env);
      expect(res.status).toBe(401);
    });

    it("returns current user info", async () => {
      mockLimit
        .mockReturnValueOnce([
          {
            id: "user-1",
            name: "Kim",
            nameMasked: "K**",
            role: "WORKER",
            piiViewFull: false,
            canAwardPoints: false,
            canManageUsers: false,
          },
        ])
        .mockReturnValueOnce([{ siteId: "site-1" }])
        .mockReturnValueOnce([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/me", {}, env);
      expect(res.status).toBe(200);
    });

    it("assigns fallback site when membership is missing", async () => {
      mockLimit
        .mockReturnValueOnce([
          {
            id: "user-1",
            name: "Kim",
            nameMasked: "K**",
            role: "WORKER",
            piiViewFull: false,
            canAwardPoints: true,
            canManageUsers: false,
          },
        ])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([{ id: "site-fallback" }])
        .mockReturnValueOnce([]);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/me", {}, env);

      expect(res.status).toBe(200);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("throws 404 when user not found", async () => {
      mockLimit.mockReturnValueOnce([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/me", {}, env);
      expect(res.status).toBe(404);
    });
  });
});
