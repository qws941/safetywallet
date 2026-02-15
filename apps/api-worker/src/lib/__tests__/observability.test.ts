import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { log, startTimer } from "../observability";

describe("observability", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log", () => {
    it("logs debug messages", () => {
      log.debug("debug-msg", { metadata: { extra: "data" } });
      expect(console.log).toHaveBeenCalledOnce();
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.level).toBe("debug");
      expect(output.message).toBe("debug-msg");
      expect(output.metadata).toEqual({ extra: "data" });
    });

    it("logs info messages", () => {
      log.info("info-msg");
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.level).toBe("info");
    });

    it("logs warn messages", () => {
      log.warn("warn-msg");
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.level).toBe("warn");
    });

    it("logs error messages with Error instance", () => {
      const err = new Error("fail");
      log.error("error-msg", err, { userId: "123" });
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.level).toBe("error");
      expect(output.message).toBe("error-msg");
      expect(output.error.message).toBe("fail");
      expect(output.error.name).toBe("Error");
      expect(output.error.stack).toBeDefined();
      expect(output.userId).toBe("123");
    });

    it("logs error messages with non-Error value", () => {
      log.error("error-msg", "string-error");
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.error.name).toBe("UnknownError");
      expect(output.error.message).toBe("string-error");
    });
  });

  describe("startTimer", () => {
    it("logs duration when end is called", () => {
      const timer = startTimer();
      timer.end("my-action", { userId: "u1" });

      expect(console.log).toHaveBeenCalledOnce();
      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.level).toBe("info");
      expect(output.action).toBe("my-action");
      expect(typeof output.duration).toBe("number");
      expect(output.userId).toBe("u1");
    });

    it("works without extra context", () => {
      const timer = startTimer();
      timer.end("simple-action");

      const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(output.action).toBe("simple-action");
    });
  });
});
