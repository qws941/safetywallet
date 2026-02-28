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
          valid: (t: string) => unknown;
          query: (k: string) => string | undefined;
          addValidatedData: (target: string, data: unknown) => void;
        };
      },
      next: () => Promise<void>,
    ) => {
      if (_target === "query") {
        const url = new URL((c as unknown as { req: { url: string } }).req.url);
        const params: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
          params[k] = v;
        });
        c.req.addValidatedData("query", params);
      } else {
        const body = await c.req.json();
        c.req.addValidatedData("json", body);
      }
      await next();
    };
  },
}));

let thenableResults: unknown[] = [];
let thenableIndex = 0;

function makeThenableChain(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === "then") {
        const result = thenableResults[thenableIndex] ?? [];
        thenableIndex++;
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockDb = {
  select: vi.fn(() => makeThenableChain()),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  count: vi.fn(),
}));

vi.mock("../../../db/schema", () => ({
  recommendations: {
    id: "id",
    siteId: "siteId",
    recommenderId: "recommenderId",
    recommendedName: "recommendedName",
    tradeType: "tradeType",
    reason: "reason",
    recommendationDate: "recommendationDate",
    createdAt: "createdAt",
  },
  users: { id: "id", name: "name", companyName: "companyName" },
  sites: { id: "id", name: "name" },
}));

vi.mock("../../../lib/response", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/response")>(
    "../../../lib/response",
  );
  return actual;
});

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
  const { default: route } = await import("../recommendations");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", route);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

describe("admin/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    thenableIndex = 0;
    thenableResults = [];
    mockDb.select.mockImplementation(() => makeThenableChain());
  });

  describe("GET /recommendations", () => {
    it("returns recommendations with pagination", async () => {
      thenableResults = [
        [{ id: "r-1", recommendedName: "Kim" }],
        [{ count: 1 }],
      ];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/recommendations?page=1&limit=20",
        {},
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { items: unknown[] } };
      expect(body.data.items).toHaveLength(1);
    });

    it("returns 403 for WORKER role", async () => {
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/recommendations?page=1&limit=20",
        {},
        env,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /recommendations/stats", () => {
    it("returns stats", async () => {
      thenableResults = [
        [{ count: 5 }],
        [{ recommendedName: "Kim", tradeType: "철근", count: 3 }],
        [{ date: "2025-01-01", count: 2 }],
      ];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/recommendations/stats", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { totalRecommendations: number };
      };
      expect(body.data.totalRecommendations).toBe(5);
    });
  });

  describe("GET /recommendations/export", () => {
    it("returns CSV file", async () => {
      thenableResults = [
        [
          {
            recommendationDate: "2025-01-01",
            recommenderName: "Park",
            recommenderCompany: "ABC",
            recommendedName: "Kim",
            tradeType: "철근",
            reason: "안전 우수",
            siteName: "Severance",
          },
        ],
      ];
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/recommendations/export", {}, env);
      expect(res.status).toBe(200);
      const contentType = res.headers.get("Content-Type") || "";
      expect(contentType).toContain("text/csv");
    });
  });
});
