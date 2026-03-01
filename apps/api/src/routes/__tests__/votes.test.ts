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

function makeSelectChain() {
  const chain = new Proxy<Record<string, unknown>>(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: unknown) => void) => resolve(mockAll());
        }
        if (
          prop === "from" ||
          prop === "leftJoin" ||
          prop === "innerJoin" ||
          prop === "where" ||
          prop === "groupBy" ||
          prop === "orderBy"
        ) {
          return () => chain;
        }
        if (prop === "get") {
          return mockGet;
        }
        if (prop === "all") {
          return mockAll;
        }
        return undefined;
      },
    },
  );
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
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

    it("returns current vote state with candidates and vote counts", async () => {
      mockGet
        .mockResolvedValueOnce({ siteId: SITE_ID, userId: "user-1" })
        .mockResolvedValueOnce({ candidateId: CANDIDATE_ID });
      mockAll
        .mockResolvedValueOnce([
          {
            id: "cand-row-1",
            userId: CANDIDATE_ID,
            source: "AUTO",
            userName: "홍길동",
            userNameMasked: "홍*동",
          },
        ])
        .mockResolvedValueOnce([{ candidateId: CANDIDATE_ID, count: 3 }]);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/current", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: {
          hasVoted: boolean;
          votedCandidateId: string | null;
          vote: { candidates: Array<{ voteCount: number }> };
        };
      };
      expect(body.data.hasVoted).toBe(true);
      expect(body.data.votedCandidateId).toBe(CANDIDATE_ID);
      expect(body.data.vote.candidates[0].voteCount).toBe(3);
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

    it("returns vote history for active member", async () => {
      mockGet.mockResolvedValueOnce({ siteId: SITE_ID, userId: "user-1" });
      mockAll.mockResolvedValueOnce([
        {
          id: "vote-1",
          month: "2025-01",
          candidateId: CANDIDATE_ID,
          candidateName: "홍*동",
          votedAt: new Date().toISOString(),
        },
      ]);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/votes/my", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { votes: unknown[] } };
      expect(body.data.votes).toHaveLength(1);
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

    it("returns 400 when active voting period is missing", async () => {
      mockGet
        .mockResolvedValueOnce({
          siteId: SITE_ID,
          userId: "user-1",
          status: "ACTIVE",
        })
        .mockResolvedValueOnce(null);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: CANDIDATE_ID,
            siteId: SITE_ID,
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("VOTING_CLOSED");
    });

    it("returns 400 when candidate is not valid for period", async () => {
      mockGet
        .mockResolvedValueOnce({
          siteId: SITE_ID,
          userId: "user-1",
          status: "ACTIVE",
        })
        .mockResolvedValueOnce({ id: "period-1", month: "2025-01" })
        .mockResolvedValueOnce(null);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: CANDIDATE_ID,
            siteId: SITE_ID,
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("INVALID_CANDIDATE");
    });

    it("returns 400 when already voted in period", async () => {
      mockGet
        .mockResolvedValueOnce({
          siteId: SITE_ID,
          userId: "user-1",
          status: "ACTIVE",
        })
        .mockResolvedValueOnce({ id: "period-1", month: "2025-01" })
        .mockResolvedValueOnce({ userId: CANDIDATE_ID })
        .mockResolvedValueOnce({ id: "existing-vote" });

      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: CANDIDATE_ID,
            siteId: SITE_ID,
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("DUPLICATE_VOTE");
    });

    it("returns 400 when trying to vote for self", async () => {
      const selfCandidateId = "00000000-0000-0000-0000-000000000003";
      mockGet
        .mockResolvedValueOnce({
          siteId: SITE_ID,
          userId: selfCandidateId,
          status: "ACTIVE",
        })
        .mockResolvedValueOnce({ id: "period-1", month: "2025-01" })
        .mockResolvedValueOnce({ userId: selfCandidateId })
        .mockResolvedValueOnce(null);

      const { app, env } = await createApp(makeAuth("WORKER", selfCandidateId));
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: selfCandidateId,
            siteId: SITE_ID,
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("CANNOT_VOTE_SELF");
    });

    it("casts vote successfully", async () => {
      mockGet
        .mockResolvedValueOnce({
          siteId: SITE_ID,
          userId: "user-1",
          status: "ACTIVE",
        })
        .mockResolvedValueOnce({ id: "period-1", month: "2025-01" })
        .mockResolvedValueOnce({ userId: CANDIDATE_ID })
        .mockResolvedValueOnce(null);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/votes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: CANDIDATE_ID,
            siteId: SITE_ID,
            month: "2025-01",
          }),
        },
        env,
      );
      expect(res.status).toBe(200);
      expect(mockInsertValues).toHaveBeenCalled();
    });
  });

  describe("GET /votes/results/:siteId", () => {
    it("returns monthly vote results", async () => {
      mockAll.mockResolvedValueOnce([
        { candidateId: CANDIDATE_ID, name: "홍*동", count: 4 },
      ]);

      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        `/votes/results/${SITE_ID}?month=2025-01`,
        {},
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { month: string; results: unknown[] };
      };
      expect(body.data.month).toBe("2025-01");
      expect(body.data.results).toHaveLength(1);
    });
  });
});
