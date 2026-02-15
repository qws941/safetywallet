import { describe, expect, it, vi, beforeEach } from "vitest";
import { RateLimiter } from "../RateLimiter";
import type { Env } from "../../types";

function createMockState() {
  const storage = new Map<string, unknown>();
  let alarm: number | null = null;

  return {
    storage: {
      get: vi.fn(async (key: string) => storage.get(key) ?? null),
      put: vi.fn(async (key: string, value: unknown) => {
        storage.set(key, value);
      }),
      delete: vi.fn(async (keyOrKeys: string | string[]) => {
        if (Array.isArray(keyOrKeys)) {
          for (const k of keyOrKeys) storage.delete(k);
        } else {
          storage.delete(keyOrKeys);
        }
      }),
      list: vi.fn(async () => new Map(storage)),
      getAlarm: vi.fn(async () => alarm),
      setAlarm: vi.fn(async (ts: number) => {
        alarm = ts;
      }),
    },
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
    _storage: storage,
  };
}

describe("RateLimiter DO", () => {
  let state: ReturnType<typeof createMockState>;
  let limiter: RateLimiter;

  beforeEach(() => {
    state = createMockState();
    limiter = new RateLimiter(
      state as unknown as DurableObjectState,
      {} as Env,
    );
  });

  describe("constructor", () => {
    it("sets alarm when none exists", () => {
      expect(state.storage.setAlarm).toHaveBeenCalled();
    });

    it("does not set alarm when one already exists", async () => {
      const state2 = createMockState();
      state2.storage.getAlarm.mockResolvedValue(Date.now() + 1000);
      new RateLimiter(state2 as unknown as DurableObjectState, {} as Env);
      // Wait for blockConcurrencyWhile to fire
      await new Promise((r) => setTimeout(r, 10));
      expect(state2.storage.setAlarm).not.toHaveBeenCalled();
    });
  });

  describe("alarm", () => {
    it("cleans up expired entries", async () => {
      const past = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      state._storage.set("key1", { count: 5, resetAt: past });
      state._storage.set("key2", { count: 2, resetAt: Date.now() + 1000 });
      state._storage.set("otp:phone1", {
        hourlyCount: 1,
        hourlyResetAt: past,
        dailyCount: 3,
        dailyResetAt: past,
      });

      await limiter.alarm();

      // key1 + otp:phone1 expired, key2 still alive
      const deleteArgs = state.storage.delete.mock.calls;
      const deletedKeys =
        deleteArgs.find((c) => Array.isArray(c[0]))?.[0] ?? [];
      expect(deletedKeys).toContain("key1");
      expect(deletedKeys).toContain("otp:phone1");
      expect(deletedKeys).not.toContain("key2");

      // Reschedules alarm
      expect(state.storage.setAlarm).toHaveBeenCalled();
    });

    it("handles no expired entries", async () => {
      state._storage.set("key", { count: 1, resetAt: Date.now() + 99999999 });
      await limiter.alarm();
      // delete not called with array
      const arrayDeleteCalls = state.storage.delete.mock.calls.filter((c) =>
        Array.isArray(c[0]),
      );
      expect(arrayDeleteCalls).toHaveLength(0);
    });
  });

  describe("checkLimit", () => {
    it("allows first request", async () => {
      const r = await limiter.checkLimit("k", 5, 60000);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(4);
    });

    it("denies when at limit", async () => {
      for (let i = 0; i < 3; i++) {
        await limiter.checkLimit("k2", 3, 60000);
      }
      const r = await limiter.checkLimit("k2", 3, 60000);
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
    });

    it("resets after expiry", async () => {
      await limiter.checkLimit("k3", 1, 100);
      await new Promise((r) => setTimeout(r, 150));
      const r = await limiter.checkLimit("k3", 1, 100);
      expect(r.allowed).toBe(true);
    });
  });

  describe("recordFailure", () => {
    it("increments failures", async () => {
      const r = await limiter.recordFailure("f1");
      expect(r.failures).toBe(1);
      expect(r.lockedUntil).toBeNull();
    });

    it("locks after 5 failures", async () => {
      for (let i = 0; i < 4; i++) {
        await limiter.recordFailure("f2");
      }
      const r = await limiter.recordFailure("f2");
      expect(r.failures).toBe(5);
      expect(r.lockedUntil).toBeGreaterThan(Date.now());
    });

    it("resets count after lock expires", async () => {
      // Manually put an expired lock
      state._storage.set("f3", { failures: 5, lockedUntil: Date.now() - 1000 });
      const r = await limiter.recordFailure("f3");
      expect(r.failures).toBe(1);
      expect(r.lockedUntil).toBeNull();
    });
  });

  describe("resetFailures", () => {
    it("deletes failure record", async () => {
      await limiter.recordFailure("rf");
      await limiter.resetFailures("rf");
      expect(state._storage.has("rf")).toBe(false);
    });
  });

  describe("checkOtpLimit", () => {
    it("allows first OTP request", async () => {
      const r = await limiter.checkOtpLimit("phone1");
      expect(r.allowed).toBe(true);
      expect(r.hourlyRemaining).toBe(4);
      expect(r.dailyRemaining).toBe(9);
    });

    it("denies when hourly limit reached", async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.checkOtpLimit("phone2");
      }
      const r = await limiter.checkOtpLimit("phone2");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("HOURLY_LIMIT");
    });

    it("denies when daily limit reached", async () => {
      // Simulate: put a record already at hourly reset (but still counting daily)
      state._storage.set("otp:phone3", {
        hourlyCount: 0,
        hourlyResetAt: Date.now() + 3600000,
        dailyCount: 10,
        dailyResetAt: Date.now() + 86400000,
      });
      const r = await limiter.checkOtpLimit("phone3");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("DAILY_LIMIT");
    });

    it("resets hourly count when window expires", async () => {
      state._storage.set("otp:phone4", {
        hourlyCount: 5,
        hourlyResetAt: Date.now() - 1000,
        dailyCount: 5,
        dailyResetAt: Date.now() + 86400000,
      });
      const r = await limiter.checkOtpLimit("phone4");
      expect(r.allowed).toBe(true);
      expect(r.hourlyRemaining).toBe(4);
    });

    it("resets daily count when window expires", async () => {
      state._storage.set("otp:phone5", {
        hourlyCount: 5,
        hourlyResetAt: Date.now() - 1000,
        dailyCount: 10,
        dailyResetAt: Date.now() - 1000,
      });
      const r = await limiter.checkOtpLimit("phone5");
      expect(r.allowed).toBe(true);
    });
  });

  describe("resetOtpLimit", () => {
    it("deletes OTP record", async () => {
      await limiter.checkOtpLimit("phoneDel");
      await limiter.resetOtpLimit("phoneDel");
      expect(state._storage.has("otp:phoneDel")).toBe(false);
    });
  });

  describe("fetch", () => {
    it("returns 405 for GET", async () => {
      const req = new Request("https://rate-limiter/check", { method: "GET" });
      const res = await limiter.fetch(req);
      expect(res.status).toBe(405);
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: "not json",
      });
      const res = await limiter.fetch(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for unknown action", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({ action: "unknown", key: "k" }),
      });
      const res = await limiter.fetch(req);
      expect(res.status).toBe(400);
    });

    it("routes checkLimit action", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({
          action: "checkLimit",
          key: "k",
          limit: 5,
          windowMs: 60000,
        }),
      });
      const res = await limiter.fetch(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { allowed: boolean };
      expect(body.allowed).toBe(true);
    });

    it("routes recordFailure action", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({ action: "recordFailure", key: "k" }),
      });
      const res = await limiter.fetch(req);
      const body = (await res.json()) as { failures: number };
      expect(body.failures).toBe(1);
    });

    it("routes resetFailures action", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({ action: "resetFailures", key: "k" }),
      });
      const res = await limiter.fetch(req);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });

    it("routes checkOtpLimit action", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({ action: "checkOtpLimit", key: "phone1" }),
      });
      const res = await limiter.fetch(req);
      const body = (await res.json()) as { allowed: boolean };
      expect(body.allowed).toBe(true);
    });

    it("routes resetOtpLimit action", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({ action: "resetOtpLimit", key: "phone1" }),
      });
      const res = await limiter.fetch(req);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    });

    it("returns 400 for null payload", async () => {
      const req = new Request("https://rate-limiter/check", {
        method: "POST",
        body: "null",
      });
      const res = await limiter.fetch(req);
      expect(res.status).toBe(400);
    });
  });
});
