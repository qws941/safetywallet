import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../index";

// Mock the logger to prevent console noise
vi.mock("../lib/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("API Index", () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ALLOWED_ORIGINS: "http://localhost:3000,https://safetywallet.jclee.me",
      ENVIRONMENT: "test",
      KV: {
        get: vi.fn().mockResolvedValue(null),
      },
      ASSETS: {
        fetch: vi
          .fn()
          .mockResolvedValue(new Response("Not Found", { status: 404 })),
      },
    };
  });

  describe("CORS Middleware", () => {
    it("should allow matching origins", async () => {
      const res = await app.request(
        "http://localhost/api/health",
        {
          headers: {
            Origin: "https://safetywallet.jclee.me",
          },
        },
        mockEnv,
      );

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://safetywallet.jclee.me",
      );
    });

    it("should allow localhost origins dynamically", async () => {
      const res = await app.request(
        "http://localhost/api/health",
        {
          headers: {
            Origin: "http://localhost:3001",
          },
        },
        mockEnv,
      );

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3001",
      );
    });

    it("should reject non-matching origins", async () => {
      const res = await app.request(
        "http://localhost/api/health",
        {
          headers: {
            Origin: "https://evil.com",
          },
        },
        mockEnv,
      );

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("Health Endpoint", () => {
    it("should return healthy status", async () => {
      const res = await app.request("http://localhost/api/health", {}, mockEnv);
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("healthy");
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("System Status Endpoint", () => {
    it("should return empty notices when KV returns null", async () => {
      const res = await app.request(
        "http://localhost/api/system/status",
        {},
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.notices).toEqual([]);
      expect(json.data.hasIssues).toBe(false);
    });

    it("should return fas_down notice when KV fas-status is down", async () => {
      mockEnv.KV.get.mockImplementation(async (key: string) => {
        if (key === "fas-status") return "down";
        return null;
      });

      const res = await app.request(
        "http://localhost/api/system/status",
        {},
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.data.hasIssues).toBe(true);
      expect(json.data.notices[0].type).toBe("fas_down");
    });

    it("should return parsed maintenance notice", async () => {
      mockEnv.KV.get.mockImplementation(async (key: string) => {
        if (key === "maintenance-message")
          return JSON.stringify({
            message: "Scheduled maintenance",
            severity: "critical",
          });
        return null;
      });

      const res = await app.request(
        "http://localhost/api/system/status",
        {},
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.data.notices[0]).toEqual({
        type: "maintenance",
        message: "Scheduled maintenance",
        severity: "critical",
      });
    });

    it("should return raw maintenance notice if parsing fails", async () => {
      mockEnv.KV.get.mockImplementation(async (key: string) => {
        if (key === "maintenance-message") return "Just a plain string message";
        return null;
      });

      const res = await app.request(
        "http://localhost/api/system/status",
        {},
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.data.notices[0]).toEqual({
        type: "maintenance",
        message: "Just a plain string message",
        severity: "info",
      });
    });

    it("should handle KV errors gracefully", async () => {
      mockEnv.KV.get.mockRejectedValue(new Error("KV error"));

      const res = await app.request(
        "http://localhost/api/system/status",
        {},
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.data.notices).toEqual([]);
    });
  });

  describe("API 404 Handler", () => {
    it("should return formatted 404 JSON for unknown API routes", async () => {
      const res = await app.request(
        "http://localhost/api/unknown-route",
        {},
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Error Handler", () => {
    it("should handle HTTP exceptions properly", async () => {
      const res = await app.request(
        "http://localhost/api/health",
        {
          method: "POST", // Method not allowed should trigger error handler
        },
        mockEnv,
      );
      const json = (await res.json()) as any;

      expect(res.status).toBe(404); // Hono returns 404 for method not found by default
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });
});
