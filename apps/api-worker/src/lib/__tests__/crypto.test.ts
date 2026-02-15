import { describe, expect, it } from "vitest";
import {
  decrypt,
  encrypt,
  hashPassword,
  hmac,
  verifyPassword,
} from "../crypto";
import { KEY_VERSION } from "../key-manager";

function makeBase64Key(seed: number): string {
  const bytes = Uint8Array.from({ length: 32 }, (_, i) => (i + seed) % 256);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function importAesKey(base64Key: string): Promise<CryptoKey> {
  const binary = atob(base64Key);
  const raw = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    raw[i] = binary.charCodeAt(i);
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

describe("crypto utilities", () => {
  it("produces consistent HMAC for same secret and payload", async () => {
    const first = await hmac("secret", "payload");
    const second = await hmac("secret", "payload");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different HMAC values for different inputs", async () => {
    const left = await hmac("secret", "payload-a");
    const right = await hmac("secret", "payload-b");

    expect(left).not.toBe(right);
  });

  it("encrypts and decrypts legacy payload format with base64 key", async () => {
    const key = makeBase64Key(7);
    const plaintext = "sensitive-user-data";

    const encrypted = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, encrypted);

    expect(encrypted.startsWith("v")).toBe(false);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decrypted).toBe(plaintext);
  });

  it("encrypts and decrypts versioned payload format with CryptoKey", async () => {
    const key = await importAesKey(makeBase64Key(11));
    const plaintext = "field-report";

    const encrypted = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, encrypted);

    expect(encrypted.startsWith(`v${KEY_VERSION}:`)).toBe(true);
    expect(decrypted).toBe(plaintext);
  });

  it("decrypts legacy ciphertext using legacy fallback key", async () => {
    const legacyKey = makeBase64Key(19);
    const cryptoKey = await importAesKey(makeBase64Key(23));
    const plaintext = "legacy-compatible";
    const encryptedLegacy = await encrypt(legacyKey, plaintext);

    const decrypted = await decrypt(cryptoKey, encryptedLegacy, legacyKey);

    expect(decrypted).toBe(plaintext);
  });

  it("rejects invalid encrypted payload format", async () => {
    const key = makeBase64Key(3);

    await expect(decrypt(key, "invalid-payload")).rejects.toThrow(
      "Invalid encrypted payload format",
    );
  });

  it("hashes and verifies passwords", async () => {
    const subtle = crypto.subtle as SubtleCrypto & {
      timingSafeEqual?: (left: BufferSource, right: BufferSource) => boolean;
    };
    const originalTimingSafeEqual = subtle.timingSafeEqual;
    if (!originalTimingSafeEqual) {
      subtle.timingSafeEqual = (left, right) => {
        const leftBytes =
          left instanceof ArrayBuffer
            ? new Uint8Array(left)
            : new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
        const rightBytes =
          right instanceof ArrayBuffer
            ? new Uint8Array(right)
            : new Uint8Array(right.buffer, right.byteOffset, right.byteLength);

        if (leftBytes.length !== rightBytes.length) return false;
        let diff = 0;
        for (let i = 0; i < leftBytes.length; i++) {
          diff |= leftBytes[i] ^ rightBytes[i];
        }
        return diff === 0;
      };
    }

    const stored = await hashPassword("P@ssw0rd!");

    expect(stored.startsWith("pbkdf2:100000:")).toBe(true);
    await expect(verifyPassword("P@ssw0rd!", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", stored)).resolves.toBe(false);
    await expect(verifyPassword("P@ssw0rd!", "pbkdf2:bad")).resolves.toBe(
      false,
    );

    subtle.timingSafeEqual = originalTimingSafeEqual;
  });
});
