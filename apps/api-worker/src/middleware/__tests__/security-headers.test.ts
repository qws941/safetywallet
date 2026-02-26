import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { securityHeaders } from "../security-headers";

describe("securityHeaders middleware", () => {
  it("adds all expected security headers", async () => {
    const app = new Hono();
    app.use("*", securityHeaders);
    app.get("/ping", (c) => c.json({ ok: true }));

    const res = await app.request("http://localhost/ping");

    expect(res.headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'",
    );
    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });
});
