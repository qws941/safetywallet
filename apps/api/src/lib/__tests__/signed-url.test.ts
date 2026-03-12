import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateSignedPath,
  verifySignedPath,
  toUnsignedR2Path,
} from "../signed-url";

describe("signed URL helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates signed /r2 path with exp and sig", async () => {
    const signedPath = await generateSignedPath(
      "posts/post-1/image.jpg",
      "secret",
    );
    const parsed = new URL(`https://example.com${signedPath}`);

    expect(parsed.pathname).toBe("/r2/posts/post-1/image.jpg");
    expect(parsed.searchParams.get("exp")).toBe("1773277200");
    expect(parsed.searchParams.get("sig")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies valid signature and expiry", async () => {
    const signedPath = await generateSignedPath("uploads/a.jpg", "secret");
    const parsed = new URL(`https://example.com${signedPath}`);
    const ok = await verifySignedPath(
      parsed.pathname,
      {
        exp: parsed.searchParams.get("exp") ?? "",
        sig: parsed.searchParams.get("sig") ?? "",
      },
      "secret",
    );

    expect(ok).toBe(true);
  });

  it("fails verification when signature is tampered", async () => {
    const signedPath = await generateSignedPath("uploads/a.jpg", "secret");
    const parsed = new URL(`https://example.com${signedPath}`);
    const originalSig = parsed.searchParams.get("sig") ?? "";
    const tamperedSig = `${originalSig.slice(0, -1)}${originalSig.endsWith("a") ? "b" : "a"}`;

    const ok = await verifySignedPath(
      parsed.pathname,
      {
        exp: parsed.searchParams.get("exp") ?? "",
        sig: tamperedSig,
      },
      "secret",
    );

    expect(ok).toBe(false);
  });

  it("fails verification for expired timestamp", async () => {
    const signedPath = await generateSignedPath("uploads/a.jpg", "secret", 60);
    const parsed = new URL(`https://example.com${signedPath}`);

    vi.setSystemTime(new Date("2026-03-12T00:02:00.000Z"));

    const ok = await verifySignedPath(
      parsed.pathname,
      {
        exp: parsed.searchParams.get("exp") ?? "",
        sig: parsed.searchParams.get("sig") ?? "",
      },
      "secret",
    );

    expect(ok).toBe(false);
  });

  it("fails verification with missing parameters", async () => {
    const signedPath = await generateSignedPath("uploads/a.jpg", "secret");
    const parsed = new URL(`https://example.com${signedPath}`);

    const missingExp = await verifySignedPath(
      parsed.pathname,
      { exp: "", sig: parsed.searchParams.get("sig") ?? "" },
      "secret",
    );
    const missingSig = await verifySignedPath(
      parsed.pathname,
      { exp: parsed.searchParams.get("exp") ?? "", sig: "" },
      "secret",
    );

    expect(missingExp).toBe(false);
    expect(missingSig).toBe(false);
  });

  it("normalizes signed r2 path to unsigned path", () => {
    expect(toUnsignedR2Path("/r2/uploads/a.jpg?exp=123&sig=abc")).toBe(
      "/r2/uploads/a.jpg",
    );
  });
});
