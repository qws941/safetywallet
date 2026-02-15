import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

type AppEnv = {
  Bindings: Record<string, unknown>;
  Variables: { auth: AuthContext };
};

vi.mock("../../middleware/auth", () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
    next(),
  ),
}));

vi.mock("../../middleware/attendance", () => ({
  attendanceMiddleware: vi.fn(),
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

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockInsertValues = vi.fn();

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          all: mockAll,
          get: mockGet,
        })),
      })),
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockReturnValue(mockAll()),
        })),
      })),
      where: vi.fn(() => ({
        get: mockGet,
        all: mockAll,
        groupBy: vi.fn(() => ({
          all: mockAll,
        })),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: mockInsertValues.mockResolvedValue({ success: true }),
  })),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("../../db/schema", () => ({
  votes: {
    id: "id",
    siteId: "siteId",
    month: "month",
    voterId: "voterId",
    candidateId: "candidateId",
    votedAt: "votedAt",
  },
  voteCandidates: {
    id: "id",
    siteId: "siteId",
    month: "month",
    userId: "userId",
    source: "source",
  },
  votePeriods: {
    id: "id",
    siteId: "siteId",
    month: "month",
    startDate: "startDate",
    endDate: "endDate",
  },
  users: { id: "id", name: "name", nameMasked: "nameMasked" },
  siteMemberships: {
    userId: "userId",
    siteId: "siteId",
    status: "status",
    role: "role",
  },
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

function makeAuth(role = "WORKER", userId = "user-1"): AuthContext {
  return {
    user: {
      id: userId,
      name: "Test",
      nameMasked: "Te**",
      phone: "010-0000",
      role,
    },
    loginDate: "2025-01-01",
  };
}

async function createApp(auth?: AuthContext) {
  const { default: votesRoute } = await import("../votes");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/votes", votesRoute);
  const env = { DB: {} } as Record<string, unknown>;
  return { app, env };
}

const SITE_ID = "00000000-0000-0000-0000-000000000001";
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000002";

describe("routes/votes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /votes/current", () => {
    it("returns no active site message when no membership", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/current", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { vote: null; message: string };
      };
      expect(body.data.vote).toBeNull();
    });

    it("returns no voting message when no candidates", async () => {
      mockGet.mockResolvedValue({ siteId: SITE_ID, userId: "user-1" });
      mockAll.mockResolvedValue([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/current", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { vote: null; message: string };
      };
      expect(body.data.vote).toBeNull();
    });
  });

  describe("GET /votes/my", () => {
    it("returns 400 when no active site", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/my", {}, env);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("NO_ACTIVE_SITE");
    });
  });

  describe("POST /votes", () => {
    const validBody = {
      siteId: SITE_ID,
      candidateId: CANDIDATE_ID,
      month: "2025-01",
    };

    it("returns 400 when no active site membership", async () => {
      mockGet.mockResolvedValue(null);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid body (missing candidateId)", async () => {
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId: SITE_ID }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });
  });
});
