import { describe, expect, it, vi } from "vitest";
import { acquireSyncLock, releaseSyncLock } from "../sync-lock";
import { createMockKV } from "../../__tests__/helpers";

describe("sync-lock", () => {
  // ---------- acquireSyncLock ----------

  describe("acquireSyncLock", () => {
    it("acquires lock when not held", async () => {
      const kv = createMockKV();
      const result = await acquireSyncLock(
        kv as unknown as KVNamespace,
        "test-lock",
      );
      expect(result.acquired).toBe(true);
    });

    it("writes lock to KV with expirationTtl", async () => {
      const kv = createMockKV();
      await acquireSyncLock(kv as unknown as KVNamespace, "test-lock", 120);

      expect(kv.put).toHaveBeenCalledWith(
        "sync:lock:test-lock",
        expect.any(String),
        expect.objectContaining({ expirationTtl: 120 }),
      );
    });

    it("fails when lock is already held", async () => {
      const kv = createMockKV();
      // Pre-set a lock
      await kv.put("sync:lock:test-lock", "existing-holder");

      const result = await acquireSyncLock(
        kv as unknown as KVNamespace,
        "test-lock",
      );
      expect(result.acquired).toBe(false);
      expect(result.holder).toBe("existing-holder");
    });

    it("uses default TTL of 300 seconds", async () => {
      const kv = createMockKV();
      await acquireSyncLock(kv as unknown as KVNamespace, "test-lock");

      expect(kv.put).toHaveBeenCalledWith(
        "sync:lock:test-lock",
        expect.any(String),
        expect.objectContaining({ expirationTtl: 300 }),
      );
    });
  });

  // ---------- releaseSyncLock ----------

  describe("releaseSyncLock", () => {
    it("deletes the lock from KV", async () => {
      const kv = createMockKV();
      await kv.put("sync:lock:test-lock", "holder");

      await releaseSyncLock(kv as unknown as KVNamespace, "test-lock");

      expect(kv.delete).toHaveBeenCalledWith("sync:lock:test-lock");
    });

    it("does not throw when lock does not exist", async () => {
      const kv = createMockKV();
      await expect(
        releaseSyncLock(kv as unknown as KVNamespace, "nonexistent"),
      ).resolves.not.toThrow();
    });

    it("handles KV delete errors gracefully", async () => {
      const kv = createMockKV();
      (kv.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("KV down"),
      );

      // Should not throw
      await expect(
        releaseSyncLock(kv as unknown as KVNamespace, "test-lock"),
      ).resolves.not.toThrow();
    });
  });
});
