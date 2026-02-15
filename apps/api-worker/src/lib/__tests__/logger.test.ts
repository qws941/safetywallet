import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";

describe("createLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("emits structured info logs to console.log", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = createLogger("unit-test");

    logger.info("hello", { requestId: "req-1" });

    expect(logSpy).toHaveBeenCalledOnce();
    const [payload] = logSpy.mock.calls[0];
    const entry = JSON.parse(String(payload)) as {
      level: string;
      module: string;
      message: string;
      service: string;
      data?: Record<string, unknown>;
      timestamp: string;
    };

    expect(entry).toMatchObject({
      level: "info",
      module: "unit-test",
      message: "hello",
      service: "safework2-api",
      data: { requestId: "req-1" },
    });
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
  });

  it("routes warn and error logs to the matching console methods", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = createLogger("unit-test");

    logger.warn("careful");
    logger.error("broken");

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("ships warn/error logs to Elasticsearch and uses waitUntil", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 201 }));
    const logger = createLogger("unit-test", {
      elasticsearchUrl: "https://elastic.example",
      waitUntil,
    });

    logger.warn("index-me", { traceId: "t-1" });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(waitUntil).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("https://elastic.example/logs-");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(String(init?.body)) as {
      level: string;
      module: string;
      msg: string;
      "@timestamp": string;
    };
    expect(body.level).toBe("warn");
    expect(body.module).toBe("unit-test");
    expect(body.msg).toBe("index-me");
    expect(Number.isNaN(Date.parse(body["@timestamp"]))).toBe(false);
  });

  it("handles Elasticsearch fetch rejection gracefully", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network failure"));
    const logger = createLogger("unit-test", {
      elasticsearchUrl: "https://elastic.example",
    });

    // Should not throw even though fetch rejects
    logger.warn("ship-fail");

    // Wait for the async rejection handler to fire
    await new Promise((r) => setTimeout(r, 10));

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("does not ship info logs to Elasticsearch", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const logger = createLogger("unit-test", {
      elasticsearchUrl: "https://elastic.example",
    });

    logger.info("not-shipped");

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
