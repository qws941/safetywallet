import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { csrfProtection } from "../csrf";
import type { Env } from "../../types";

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    R2: {} as R2Bucket,
    ASSETS: {
      fetch: () => Promise.resolve(new Response(null, { status: 404 })),
    } as unknown as Fetcher,
    KV: {} as KVNamespace,
    JWT_SECRET: "test",
    HMAC_SECRET: "test",
    ENCRYPTION_KEY: "test",
    REQUIRE_ATTENDANCE_FOR_LOGIN: "false",
    REQUIRE_ATTENDANCE_FOR_POST: "false",
    ENVIRONMENT: "production",
    ALLOWED_ORIGINS:
      "https://safetywallet.jclee.me,https://admin.safetywallet.jclee.me",
    ...overrides,
  };
}

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", csrfProtection);

  app.get("/resource", (c) => c.json({ ok: true }));
  app.on("HEAD", "/resource", (c) => c.body(null, 200));
  app.options("/resource", (c) => c.body(null, 204));
  app.post("/resource", (c) => c.json({ ok: true }));
  app.put("/resource", (c) => c.json({ ok: true }));
  app.patch("/resource", (c) => c.json({ ok: true }));
  app.delete("/resource", (c) => c.json({ ok: true }));
  app.post("/webhooks/test", (c) => c.json({ ok: true }));

  return app;
}

describe("csrfProtection middleware", () => {
  it("passes through GET, HEAD, OPTIONS requests", async () => {
    const app = createApp();
    const env = makeEnv();

    const getRes = await app.request(
      "http://localhost/resource",
      { method: "GET" },
      env,
    );
    const headRes = await app.request(
      "http://localhost/resource",
      { method: "HEAD" },
      env,
    );
    const optionsRes = await app.request(
      "http://localhost/resource",
      { method: "OPTIONS" },
      env,
    );

    expect(getRes.status).toBe(200);
    expect(headRes.status).toBe(200);
    expect(optionsRes.status).toBe(204);
  });

  it("allows POST with valid Origin header", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/resource",
      {
        method: "POST",
        headers: { Origin: "https://safetywallet.jclee.me" },
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
  });

  it("rejects POST with invalid Origin header", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/resource",
      {
        method: "POST",
        headers: { Origin: "https://evil.example" },
      },
      makeEnv(),
    );

    expect(res.status).toBe(403);
  });

  it("allows POST with valid Referer when Origin is missing", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/resource",
      {
        method: "POST",
        headers: { Referer: "https://admin.safetywallet.jclee.me/posts/new" },
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
  });

  it("rejects POST when both Origin and Referer are missing", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/resource",
      { method: "POST" },
      makeEnv(),
    );

    expect(res.status).toBe(403);
  });

  it("skips CSRF checks when Authorization has Bearer token", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/resource",
      {
        method: "POST",
        headers: { Authorization: "Bearer jwt-token-for-api-client" },
      },
      makeEnv(),
    );

    expect(res.status).toBe(200);
  });

  it("checks PUT, PATCH, DELETE as state-changing methods", async () => {
    const app = createApp();
    const env = makeEnv();

    const putRes = await app.request(
      "http://localhost/resource",
      {
        method: "PUT",
        headers: { Origin: "https://safetywallet.jclee.me" },
      },
      env,
    );
    const patchRes = await app.request(
      "http://localhost/resource",
      {
        method: "PATCH",
        headers: { Origin: "https://safetywallet.jclee.me" },
      },
      env,
    );
    const deleteRes = await app.request(
      "http://localhost/resource",
      {
        method: "DELETE",
        headers: { Origin: "https://evil.example" },
      },
      env,
    );

    expect(putRes.status).toBe(200);
    expect(patchRes.status).toBe(200);
    expect(deleteRes.status).toBe(403);
  });

  it("skips CSRF checks for webhook endpoints", async () => {
    const app = createApp();
    const res = await app.request(
      "http://localhost/webhooks/test",
      { method: "POST" },
      makeEnv(),
    );

    expect(res.status).toBe(200);
  });
});
