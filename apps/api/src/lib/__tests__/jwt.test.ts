import * as jose from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkSameDay, signJwt, verifyJwt } from "../jwt";

describe("jwt helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("signs and verifies jwt with KST loginDate", async () => {
    vi.setSystemTime(new Date("2026-02-15T15:30:00.000Z"));
    const secret = "jwt-secret";

    const token = await signJwt(
      {
        sub: "user-1",
        phone: "01012345678",
        role: "WORKER",
      },
      secret,
      "2h",
    );
    const payload = await verifyJwt(token, secret);

    expect(payload).toEqual({
      sub: "user-1",
      phone: "01012345678",
      role: "WORKER",
      loginDate: "2026-02-16",
    });
  });

  it("returns null for invalid signature", async () => {
    const token = await signJwt(
      {
        sub: "user-1",
        phone: "01012345678",
        role: "WORKER",
      },
      "secret-a",
    );

    const payload = await verifyJwt(token, "secret-b");
    expect(payload).toBeNull();
  });

  it("returns null for malformed or incomplete payload token", async () => {
    const malformed = await verifyJwt("not.a.jwt", "secret");
    expect(malformed).toBeNull();

    const token = await new jose.SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("secret"));

    const incomplete = await verifyJwt(token, "secret");
    expect(incomplete).toBeNull();
  });

  it("checkSameDay follows KST calendar date", () => {
    vi.setSystemTime(new Date("2026-02-15T15:30:00.000Z"));

    expect(checkSameDay("2026-02-16")).toBe(true);
    expect(checkSameDay("2026-02-15")).toBe(false);
  });
});
