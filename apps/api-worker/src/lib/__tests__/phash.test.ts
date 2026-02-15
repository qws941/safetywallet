import { describe, expect, it } from "vitest";
import {
  computeImageHash,
  DUPLICATE_THRESHOLD,
  hammingDistance,
} from "../phash";

function makeBuffer(length: number, factor: number): ArrayBuffer {
  return Uint8Array.from({ length }, (_, i) => (i * factor) % 256).buffer;
}

describe("phash utilities", () => {
  it("computes a 64-bit hash as 16-char hex", async () => {
    const hash = await computeImageHash(makeBuffer(4096, 13));

    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it("produces deterministic hash for the same bytes", async () => {
    const source = makeBuffer(5000, 7);
    const first = await computeImageHash(source);
    const second = await computeImageHash(source);

    expect(first).toBe(second);
  });

  it("produces different hashes for clearly different bytes", async () => {
    const first = await computeImageHash(makeBuffer(4096, 3));
    const second = await computeImageHash(makeBuffer(4096, 17));

    expect(first).not.toBe(second);
  });

  it("computes expected hamming distance values", () => {
    expect(hammingDistance("0".repeat(16), "0".repeat(16))).toBe(0);
    expect(hammingDistance("0".repeat(16), "f".repeat(16))).toBe(64);
    expect(hammingDistance("abcd", "abc")).toBe(64);
  });

  it("uses duplicate threshold of 10 bits", () => {
    expect(DUPLICATE_THRESHOLD).toBe(10);
  });
});
