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
  attendanceMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) =>
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
  chain.values = vi.fn(self);
  chain.returning = vi.fn(self);
  chain.get = mockGet;
  chain.run = mockRun;
  return chain;
}

function makeUpdateChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.set = vi.fn(self);
  chain.where = vi.fn(self);
  chain.returning = vi.fn(self);
  chain.get = mockGet;
  chain.run = mockRun;
  return chain;
}

function makeDeleteChain() {
  const chain: Record<string, unknown> = {};
  const self = (): Record<string, unknown> => chain;
  chain.where = vi.fn(self);
  chain.run = mockRun;
  return chain;
}

const mockDb = {
  select: vi.fn(() => makeSelectChain()),
  insert: vi.fn(() => makeInsertChain()),
  update: vi.fn(() => makeUpdateChain()),
  delete: vi.fn(() => makeDeleteChain()),
};

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

vi.mock("../../db/schema", () => ({
  actions: {
    id: "id",
    postId: "postId",
    assigneeId: "assigneeId",
    actionStatus: "actionStatus",
    createdAt: "createdAt",
    completedAt: "completedAt",
    completionNote: "completionNote",
  },
  actionImages: {
    id: "id",
    actionId: "actionId",
    fileUrl: "fileUrl",
    imageType: "imageType",
    createdAt: "createdAt",
  },
  posts: {
    id: "id",
    siteId: "siteId",
    content: "content",
    category: "category",
  },
  pointsLedger: { id: "id" },
  siteMemberships: {
    userId: "userId",
    siteId: "siteId",
    role: "role",
    status: "status",
  },
  users: { id: "id", nameMasked: "nameMasked", companyName: "companyName" },
}));

vi.mock("../../lib/response", async () => {
  const actual =
    await vi.importActual<typeof import("../../lib/response")>(
      "../../lib/response",
    );
  return actual;
});

vi.mock("../../lib/audit", () => ({
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

async function createApp(auth?: AuthContext) {
  const { default: route } = await import("../actions");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", route);
  const env = {
    DB: {},
    R2: { put: vi.fn(), delete: vi.fn() },
  } as Record<string, unknown>;
  return { app, env };
}

describe("actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.insert.mockImplementation(() => makeInsertChain());
    mockDb.update.mockImplementation(() => makeUpdateChain());
    mockDb.delete.mockImplementation(() => makeDeleteChain());
  });

  describe("POST /", () => {
    it("returns 400 when postId is missing", async () => {
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeType: "INDIVIDUAL" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when post not found", async () => {
      mockGet.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: "00000000-0000-0000-0000-000000000001",
            assigneeType: "INDIVIDUAL",
          }),
        },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is a WORKER", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "post-1", siteId: "site-1" })
        .mockResolvedValueOnce({ role: "WORKER" });
      const { app, env } = await createApp(makeAuth("WORKER"));
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: "00000000-0000-0000-0000-000000000001",
            assigneeType: "INDIVIDUAL",
          }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });

    it("creates an action successfully", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "post-1", siteId: "site-1" })
        .mockResolvedValueOnce({ role: "SITE_ADMIN" })
        .mockResolvedValueOnce({ id: "action-1", actionStatus: "NONE" });
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: "00000000-0000-0000-0000-000000000001",
            assigneeType: "INDIVIDUAL",
          }),
        },
        env,
      );
      expect(res.status).toBe(201);
      const json = (await res.json()) as { data: { action: { id: string } } };
      expect(json.data.action.id).toBe("action-1");
    });
  });

  describe("GET /", () => {
    it("returns a list of actions", async () => {
      mockAll.mockResolvedValueOnce([
        {
          action: { id: "a1", actionStatus: "NONE" },
          post: { id: "p1", title: "test", category: "UNSAFE_ACT" },
          assignee: null,
        },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/", {}, env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: { data: unknown[] } };
      expect(json.data.data).toHaveLength(1);
    });
  });

  describe("GET /my", () => {
    it("returns my assigned actions", async () => {
      mockAll.mockResolvedValueOnce([]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/my", {}, env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: { data: unknown[] } };
      expect(json.data.data).toHaveLength(0);
    });
  });

  describe("GET /:id", () => {
    it("returns 404 when action not found", async () => {
      mockGet.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/action-1", {}, env);
      expect(res.status).toBe(404);
    });

    it("returns action with images", async () => {
      mockGet.mockResolvedValueOnce({
        action: { id: "a1", actionStatus: "NONE" },
        post: { id: "p1", title: "test", category: "UNSAFE_ACT" },
        assignee: null,
      });
      mockAll.mockResolvedValueOnce([
        { id: "img1", fileUrl: "actions/a1/test.jpg" },
      ]);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request("/action-1", {}, env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: { data: { images: unknown[] } };
      };
      expect(json.data.data.images).toHaveLength(1);
    });
  });

  describe("PATCH /:id", () => {
    it("returns 404 when action not found", async () => {
      mockGet.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth());
      const res = await app.request(
        "/action-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionStatus: "ASSIGNED" }),
        },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid status transition", async () => {
      mockGet
        .mockResolvedValueOnce({
          id: "a1",
          actionStatus: "NONE",
          postId: "p1",
          assigneeId: "user-1",
        })
        .mockResolvedValueOnce({ id: "p1", siteId: "site-1" })
        .mockResolvedValueOnce({ role: "SITE_ADMIN" });
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/a1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionStatus: "COMPLETED" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("updates action status successfully", async () => {
      mockGet
        .mockResolvedValueOnce({
          id: "a1",
          actionStatus: "NONE",
          postId: "p1",
          assigneeId: "user-1",
        })
        .mockResolvedValueOnce({ id: "p1", siteId: "site-1" })
        .mockResolvedValueOnce({ role: "SITE_ADMIN" })
        .mockResolvedValueOnce({ id: "a1", actionStatus: "ASSIGNED" });
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/a1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionStatus: "ASSIGNED" }),
        },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("awards points on VERIFIED transition", async () => {
      mockGet
        .mockResolvedValueOnce({
          id: "a1",
          actionStatus: "COMPLETED",
          postId: "p1",
          assigneeId: "user-1",
        })
        .mockResolvedValueOnce({ id: "p1", siteId: "site-1" })
        .mockResolvedValueOnce({ role: "SITE_ADMIN" })
        .mockResolvedValueOnce({ id: "a1", actionStatus: "VERIFIED" });
      mockRun.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/a1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionStatus: "VERIFIED" }),
        },
        env,
      );
      expect(res.status).toBe(200);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("POST /:id/images", () => {
    it("returns 404 when action not found", async () => {
      mockGet.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth());
      const formData = new FormData();
      formData.append(
        "file",
        new File(["data"], "test.jpg", { type: "image/jpeg" }),
      );
      const res = await app.request(
        "/action-1/images",
        { method: "POST", body: formData },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("uploads image successfully as assignee", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "a1", assigneeId: "user-1", postId: "p1" })
        .mockResolvedValueOnce({ id: "p1", siteId: "site-1" })
        .mockResolvedValueOnce({ id: "img-1", fileUrl: "actions/a1/uuid.jpg" });
      const { app, env } = await createApp(makeAuth());
      const formData = new FormData();
      formData.append(
        "file",
        new File(["data"], "test.jpg", { type: "image/jpeg" }),
      );
      formData.append("imageType", "BEFORE");
      const res = await app.request(
        "/a1/images",
        { method: "POST", body: formData },
        env,
      );
      expect(res.status).toBe(201);
    });
  });

  describe("DELETE /:id/images/:imageId", () => {
    it("returns 404 when action not found", async () => {
      mockGet.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/action-1/images/img-1",
        { method: "DELETE" },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("deletes image successfully", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "a1", postId: "p1", assigneeId: "user-1" })
        .mockResolvedValueOnce({ id: "p1", siteId: "site-1" })
        .mockResolvedValueOnce({ role: "SITE_ADMIN" })
        .mockResolvedValueOnce({
          id: "img-1",
          fileUrl: "actions/a1/test.jpg",
          actionId: "a1",
        });
      mockRun.mockResolvedValueOnce(undefined);
      const { app, env } = await createApp(makeAuth("SITE_ADMIN"));
      const res = await app.request(
        "/a1/images/img-1",
        { method: "DELETE" },
        env,
      );
      expect(res.status).toBe(200);
    });
  });
});
