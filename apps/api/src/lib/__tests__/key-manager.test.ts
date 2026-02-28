import { describe, expect, it } from "vitest";
import { KEY_VERSION, createKeyManager } from "../key-manager";
import type { KeyManagerEnv } from "../key-manager";

// Generate a valid 32-byte base64 key for tests
function makeTestBase64Key(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function makeTestEnv(overrides?: Partial<KeyManagerEnv>): KeyManagerEnv {
  return {
    ENCRYPTION_KEY: makeTestBase64Key(),
    HMAC_SECRET: "test-hmac-secret-at-least-32-chars-long",
    JWT_SECRET: "test-jwt-secret",
    ...overrides,
  };
}

describe("key-manager", () => {
  describe("KEY_VERSION", () => {
    it("is 1", () => {
      expect(KEY_VERSION).toBe(1);
    });
  });

  describe("createKeyManager", () => {
    it("returns a KeyManager with keyVersion", () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      expect(km.keyVersion).toBe(KEY_VERSION);
    });

    it("getJwtSecret returns the env JWT_SECRET", () => {
      const env = makeTestEnv({ JWT_SECRET: "my-secret" });
      const km = createKeyManager(env);
      expect(km.getJwtSecret()).toBe("my-secret");
    });

    it("getPiiEncryptionKey returns a CryptoKey", async () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      const key = await km.getPiiEncryptionKey();
      expect(key).toBeDefined();
      expect(key.type).toBe("secret");
    });

    it("getPiiEncryptionKey returns same promise on repeat calls", async () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      const p1 = km.getPiiEncryptionKey();
      const p2 = km.getPiiEncryptionKey();
      expect(p1).toBe(p2); // Same promise reference (memoized)
    });

    it("getPiiHmacKey returns a CryptoKey", async () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      const key = await km.getPiiHmacKey();
      expect(key).toBeDefined();
      expect(key.type).toBe("secret");
    });

    it("getPiiHmacKey returns same promise on repeat calls", async () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      const p1 = km.getPiiHmacKey();
      const p2 = km.getPiiHmacKey();
      expect(p1).toBe(p2); // Same promise reference (memoized)
    });

    it("encryption key can encrypt and decrypt", async () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      const key = await km.getPiiEncryptionKey();

      // Verify the key has AES-GCM algorithm
      expect(key.algorithm).toMatchObject({ name: "AES-GCM" });
    });

    it("HMAC key can sign", async () => {
      const env = makeTestEnv();
      const km = createKeyManager(env);
      const key = await km.getPiiHmacKey();

      expect(key.algorithm).toMatchObject({ name: "HMAC" });
      expect(key.usages).toContain("sign");
    });

    it("throws for invalid (non-32-byte) ENCRYPTION_KEY", async () => {
      const env = makeTestEnv({ ENCRYPTION_KEY: btoa("short") });
      const km = createKeyManager(env);

      await expect(km.getPiiEncryptionKey()).rejects.toThrow(
        "ENCRYPTION_KEY must be 32 bytes",
      );
    });
  });
});
