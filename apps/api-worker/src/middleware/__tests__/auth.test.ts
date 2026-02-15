import { Hono } from "hono";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Env, AuthContext } from "../../types";

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

const mockVerifyJwt = vi.fn();
const mockCheckSameDay = vi.fn();

vi.mock("../../lib/jwt", () => ({
  verifyJwt: (...args: unknown[]) => mockVerifyJwt(...args),
  checkSameDay: (...args: unknown[]) => mockCheckSameDay(...args),
}));

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { authMiddleware } from "../auth";

function createMockD1(userResult?: Record<string, unknown> | null) {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      raw: vi
        .fn()
        .mockResolvedValue(
          userResult ? [[userResult.name, userResult.nameMasked]] : [],
        ),
      run: vi.fn().mockResolvedValue({ results: [] }),
    })),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn(),
    dump: vi.fn(),
  };
}

function makeEnv(dbOverride?: unknown): Env {
  return {
    DB: (dbOverride ?? createMockD1()) as D1Database,
    KV: {} as KVNamespace,
    R2: {} as R2Bucket,
    STATIC: {} as R2Bucket,
    JWT_SECRET: "test-secret",
    HMAC_SECRET: "test",
    ENCRYPTION_KEY: "test",
    ENVIRONMENT: "test",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
    REQUIRE_ATTENDANCE_FOR_POST: "false",
  } as Env;
}

function createApp() {
  const app = new Hono<AppEnv>();
  app.get("/secure", authMiddleware, (c) => {
    const auth = c.get("auth");
    return c.json({ ok: true, auth });
  });
  return app;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const app = createApp();
    const res = await app.request("http://localhost/secure", {}, makeEnv());
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Basic abc" } },
      makeEnv(),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    mockVerifyJwt.mockResolvedValue(null);
    const app = createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer bad-token" } },
      makeEnv(),
    );
    expect(res.status).toBe(401);
    expect(mockVerifyJwt).toHaveBeenCalledWith("bad-token", "test-secret");
  });

  it("returns 401 when login date is not same day", async () => {
    mockVerifyJwt.mockResolvedValue({
      sub: "user-1",
      phone: "010-0000-0000",
      role: "WORKER",
      loginDate: "2020-01-01",
    });
    mockCheckSameDay.mockReturnValue(false);

    const app = createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer valid-token" } },
      makeEnv(),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when user not found in DB", async () => {
    mockVerifyJwt.mockResolvedValue({
      sub: "ghost-user",
      phone: "010-0000-0000",
      role: "WORKER",
      loginDate: "2025-01-15",
    });
    mockCheckSameDay.mockReturnValue(true);

    const mockDb = createMockD1(null);
    const app = createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer valid-token" } },
      makeEnv(mockDb),
    );
    expect(res.status).toBe(401);
  });

  it("sets auth context and calls next on success", async () => {
    mockVerifyJwt.mockResolvedValue({
      sub: "user-1",
      phone: "010-1234-5678",
      role: "SITE_ADMIN",
      loginDate: "2025-01-15",
    });
    mockCheckSameDay.mockReturnValue(true);

    const mockDb = createMockD1({ name: "홍길동", nameMasked: "홍*동" });
    const app = createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer valid-token" } },
      makeEnv(mockDb),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      auth: { user: Record<string, string>; loginDate: string };
    };
    expect(body.auth.user).toEqual({
      id: "user-1",
      phone: "010-1234-5678",
      role: "SITE_ADMIN",
      name: "홍길동",
      nameMasked: "홍*동",
    });
    expect(body.auth.loginDate).toBe("2025-01-15");
  });

  it("defaults name and nameMasked to empty string when null", async () => {
    mockVerifyJwt.mockResolvedValue({
      sub: "user-2",
      phone: "010-0000-0000",
      role: "WORKER",
      loginDate: "2025-01-15",
    });
    mockCheckSameDay.mockReturnValue(true);

    const mockDb = createMockD1({ name: null, nameMasked: null });
    const app = createApp();
    const res = await app.request(
      "http://localhost/secure",
      { headers: { Authorization: "Bearer valid-token" } },
      makeEnv(mockDb),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      auth: { user: Record<string, string> };
    };
    expect(body.auth.user.name).toBe("");
    expect(body.auth.user.nameMasked).toBe("");
  });
});
