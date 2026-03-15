import { describe, expect, it, vi } from "vitest";
import {
  addToRevocationList,
  isRevoked,
  removeFromRevocationList,
} from "../token-revocation";

function createMockKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as KVNamespace;
}

describe("token-revocation", () => {
  it("adds and detects revoked user", async () => {
    const kv = createMockKv();

    await addToRevocationList(kv, "user-1");

    await expect(isRevoked(kv, "user-1")).resolves.toBe(true);
  });

  it("returns false when user is not revoked", async () => {
    const kv = createMockKv();
    await expect(isRevoked(kv, "missing")).resolves.toBe(false);
  });

  it("removes revoked user from list", async () => {
    const kv = createMockKv({ "trl:user-2": "1" });

    await removeFromRevocationList(kv, "user-2");

    await expect(isRevoked(kv, "user-2")).resolves.toBe(false);
  });
});
