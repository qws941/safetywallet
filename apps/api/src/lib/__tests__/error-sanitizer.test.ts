import { describe, expect, it } from "vitest";
import {
  createSafeErrorResponse,
  isOperationalError,
  sanitizeErrorMessage,
} from "../error-sanitizer";

describe("error-sanitizer", () => {
  it("sanitizes stack traces from messages", () => {
    const err = new Error(
      "Database crash\n    at handleRequest (/home/jclee/dev/safetywallet/apps/api/src/index.ts:120:9)",
    );

    const result = sanitizeErrorMessage(err);
    expect(result).not.toContain("at handleRequest");
    expect(result).not.toContain("/home/jclee");
  });

  it("maps SQL-related errors to a generic database message", () => {
    const err = new Error(
      "SQLITE_CONSTRAINT: UNIQUE failed: users.phone SELECT * FROM users",
    );

    expect(sanitizeErrorMessage(err)).toBe("Database error");
  });

  it("strips private IP addresses from error strings", () => {
    const result = sanitizeErrorMessage(
      "Connection refused from 10.0.0.45 at /srv/app/worker.js:12:1",
    );

    expect(result).not.toContain("10.0.0.45");
    expect(result).not.toContain("/srv/app/worker.js");
  });

  it("passes validation error messages through safely", () => {
    const zodLikeError = {
      name: "ZodError",
      message: "email is required",
      issues: [{ path: ["email"], message: "email is required" }],
    };

    expect(sanitizeErrorMessage(zodLikeError)).toBe("email is required");
  });

  it("maps authentication-related errors to a generic auth message", () => {
    const err = new Error("invalid token signature");

    expect(sanitizeErrorMessage(err)).toBe("Authentication failed");
  });

  it("classifies operational errors correctly", () => {
    expect(
      isOperationalError({ name: "ZodError", message: "bad", issues: [] }),
    ).toBe(true);
    expect(isOperationalError({ status: 401, message: "unauthorized" })).toBe(
      true,
    );
    expect(isOperationalError(new Error("boom"))).toBe(false);
  });

  it("creates safe response metadata with status and code", () => {
    const safe = createSafeErrorResponse(
      new Error("SQLITE_ERROR: malformed SQL"),
      500,
    );

    expect(safe).toEqual({
      code: "DATABASE_ERROR",
      message: "Database error",
      statusCode: 500,
    });
  });
});
