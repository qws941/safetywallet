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

vi.mock("../../../lib/audit", () => ({
  logAuditWithContext: vi.fn(),
}));

vi.mock("../../../lib/observability", () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(() => ({})),
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

function makeR2Object(body: Uint8Array, contentType = "image/jpeg") {
  return {
    httpMetadata: { contentType },
    arrayBuffer: vi.fn(async () => body.buffer),
  };
}

async function createApp(auth?: AuthContext) {
  const { default: imagesRoute } = await import("../images");
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    if (auth) c.set("auth", auth);
    await next();
  });
  app.route("/", imagesRoute);
  return app;
}

describe("admin/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /download/:key", () => {
    it("returns watermarked image download", async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const mockR2 = { get: vi.fn(async () => makeR2Object(jpegBytes)) };
      const env = { DB: {}, R2: mockR2 } as Record<string, unknown>;
      const app = await createApp(makeAuth());
      const res = await app.request("/download/photo-1.jpg", {}, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Watermark-Id")).toBeTruthy();
      expect(res.headers.get("X-Downloaded-By")).toBe("admin-1");
      expect(res.headers.get("Content-Disposition")).toContain("watermarked-");
    });

    it("returns 404 when image not found in R2", async () => {
      const mockR2 = { get: vi.fn(async () => null) };
      const env = { DB: {}, R2: mockR2 } as Record<string, unknown>;
      const app = await createApp(makeAuth());
      const res = await app.request("/download/missing.jpg", {}, env);
      expect(res.status).toBe(404);
    });

    it("returns 403 for non-admin", async () => {
      const mockR2 = { get: vi.fn() };
      const env = { DB: {}, R2: mockR2 } as Record<string, unknown>;
      const app = await createApp(makeAuth("WORKER"));
      const res = await app.request("/download/photo-1.jpg", {}, env);
      expect(res.status).toBe(403);
    });

    it("handles non-JPEG images", async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const mockR2 = {
        get: vi.fn(async () => makeR2Object(pngBytes, "image/png")),
      };
      const env = { DB: {}, R2: mockR2 } as Record<string, unknown>;
      const app = await createApp(makeAuth());
      const res = await app.request("/download/photo-1.png", {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /list", () => {
    it("returns image list from R2", async () => {
      const mockR2 = {
        list: vi.fn(async () => ({
          objects: [
            {
              key: "img-1.jpg",
              size: 1024,
              uploaded: new Date("2025-01-01"),
              httpMetadata: { contentType: "image/jpeg" },
            },
          ],
          truncated: false,
          cursor: undefined,
        })),
      };
      const env = { DB: {}, R2: mockR2 } as Record<string, unknown>;
      const app = await createApp(makeAuth());
      const res = await app.request("/list", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { images: { key: string }[]; truncated: boolean };
      };
      expect(body.data.images).toHaveLength(1);
      expect(body.data.truncated).toBe(false);
    });

    it("returns 403 for non-admin", async () => {
      const env = { DB: {}, R2: {} } as Record<string, unknown>;
      const app = await createApp(makeAuth("WORKER"));
      const res = await app.request("/list", {}, env);
      expect(res.status).toBe(403);
    });
  });
});
