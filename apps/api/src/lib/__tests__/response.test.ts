import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { error, success } from "../response";

describe("response helpers", () => {
  it("returns success envelope with data and timestamp", async () => {
    const app = new Hono();
    app.get("/ok", (c) => success(c, { id: "post-1" }, 201));

    const res = await app.request("http://localhost/ok");
    const json = (await res.json()) as {
      success: boolean;
      data: { id: string };
      timestamp: string;
    };

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ id: "post-1" });
    expect(Number.isNaN(Date.parse(json.timestamp))).toBe(false);
  });

  it("returns error envelope with code/message and timestamp", async () => {
    const app = new Hono();
    app.get("/fail", (c) => error(c, "BAD_REQUEST", "Bad input", 400));

    const res = await app.request("http://localhost/fail");
    const json = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
      timestamp: string;
    };

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toEqual({ code: "BAD_REQUEST", message: "Bad input" });
    expect(Number.isNaN(Date.parse(json.timestamp))).toBe(false);
  });
});
