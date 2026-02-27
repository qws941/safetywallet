import { Hono } from "hono";
import { vi } from "vitest";
import type { AuthContext, Env } from "../types";

type QueryValue = Record<string, unknown>;

export interface MockD1QueryQueue {
  get?: QueryValue[];
  all?: QueryValue[][];
  raw?: Array<unknown[]>[];
}

export interface MockD1Database {
  __queue: Required<MockD1QueryQueue>;
  prepare: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
  dump: ReturnType<typeof vi.fn>;
}

export function createMockD1(queue?: MockD1QueryQueue): MockD1Database {
  const state: Required<MockD1QueryQueue> = {
    get: queue?.get ? [...queue.get] : [],
    all: queue?.all ? [...queue.all] : [],
    raw: queue?.raw ? [...queue.raw] : [],
  };

  const createStatement = () => {
    const stmt: Record<string, unknown> = {
      bind: vi.fn((..._args: unknown[]) => stmt),
      run: vi.fn(async () => ({
        success: true,
        meta: { changes: 1, last_row_id: 1 },
      })),
      first: vi.fn(async () => state.get.shift() ?? null),
      all: vi.fn(async () => ({ results: state.all.shift() ?? [] })),
      raw: vi.fn(async () => state.raw.shift() ?? []),
    };
    return stmt;
  };

  return {
    __queue: state,
    prepare: vi.fn(() => createStatement()),
    batch: vi.fn(async (stmts: unknown[]) =>
      stmts.map(() => ({ success: true, results: [] })),
    ),
    exec: vi.fn(),
    dump: vi.fn(),
  };
}

export function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
}

export function createMockR2() {
  const objects = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => objects.get(key) ?? null),
    put: vi.fn(async (key: string, value: unknown) => {
      objects.set(key, value);
      return { etag: "mock-etag" };
    }),
    list: vi.fn(async () => ({ objects: [] })),
  };
}

export function createMockRateLimiterNamespace(
  fetchImpl?: (request: Request) => Promise<Response>,
) {
  const durableObject = {
    fetch: vi.fn(
      fetchImpl ??
        (async () =>
          Response.json({
            allowed: true,
            remaining: 99,
            resetAt: Date.now() + 60000,
          })),
    ),
  };

  return {
    idFromName: vi.fn((name: string) => name),
    get: vi.fn(() => durableObject),
    durableObject,
  };
}

type TestBindings = Record<string, unknown>;

export function createMockEnv(overrides?: TestBindings): TestBindings {
  const kv = createMockKV();
  const r2 = createMockR2();

  return {
    DB: createMockD1(),
    KV: kv,
    R2: r2,
    ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
    JWT_SECRET: "jwt-secret",
    HMAC_SECRET: "hmac-secret",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "true",
    REQUIRE_ATTENDANCE_FOR_POST: "true",
    ENVIRONMENT: "test",
    FAS_API_KEY: "fas-test-key",
    ...overrides,
  };
}

export function createHonoTestApp<TBindings extends Record<string, unknown>>(
  setup: (app: Hono<{ Bindings: TBindings }>) => void,
) {
  const app = new Hono<{ Bindings: TBindings }>();
  setup(app);
  return app;
}

/** Auth context factory for route tests */
export function makeAuth(
  role: string = "WORKER",
  userId: string = "user-1",
  overrides: Partial<AuthContext["user"]> = {},
): AuthContext {
  return {
    user: {
      id: userId,
      phone: "010-1234-5678",
      role,
      name: "Test User",
      nameMasked: "Te** Us**",
      ...overrides,
    },
    loginDate: new Date().toISOString().slice(0, 10),
  };
}

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

/**
 * Create a Hono app with auth bypass middleware that pre-sets the auth context.
 * Routes can read `c.get("auth")` as usual.
 * Pass `auth: null` to simulate unauthenticated requests.
 */
export function createRouteTestApp(
  registerRoutes: (app: Hono<AppEnv>) => void,
  defaultAuth: AuthContext | null = makeAuth(),
) {
  const app = new Hono<AppEnv>();

  // Auth bypass: set auth from X-Test-Role header or default
  app.use("*", async (c, next) => {
    const roleHeader = c.req.header("X-Test-Role");
    if (roleHeader) {
      const userIdHeader = c.req.header("X-Test-UserId") ?? "user-1";
      c.set("auth", makeAuth(roleHeader, userIdHeader));
    } else if (defaultAuth) {
      c.set("auth", defaultAuth);
    }
    await next();
  });

  registerRoutes(app);
  return app;
}

/** Quickly construct a mock Env with common test defaults */
export function createTestEnv(overrides?: Partial<Env>): Env {
  const db = createMockD1();
  const kv = createMockKV();
  const r2 = createMockR2();
  return {
    DB: db as unknown as D1Database,
    R2: r2 as unknown as R2Bucket,
    ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
    KV: kv as unknown as KVNamespace,
    JWT_SECRET: "jwt-secret",
    HMAC_SECRET: "hmac-secret",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "true",
    REQUIRE_ATTENDANCE_FOR_POST: "true",
    ENVIRONMENT: "test",
    ...overrides,
  } as Env;
}
