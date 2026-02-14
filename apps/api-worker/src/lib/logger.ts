/**
 * Structured logger for Cloudflare Workers.
 * Outputs JSON to console + ships error/warn to Elasticsearch.
 * See #47.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  service: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

function emit(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(json);
      break;
    case "warn":
      console.warn(json);
      break;
    default:
      console.log(json);
      break;
  }
}

function shipToElasticsearch(
  entry: LogEntry,
  elasticsearchUrl: string,
): Promise<void> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  return fetch(`${elasticsearchUrl}/logs-${date}/_doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...entry,
      msg: entry.message,
      "@timestamp": entry.timestamp,
    }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  elasticsearchUrl?: string;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const SERVICE_NAME = "safework2-api";

export function createLogger(module: string, options?: LoggerOptions): Logger {
  const log =
    (level: LogLevel) => (message: string, data?: Record<string, unknown>) => {
      const entry: LogEntry = {
        level,
        module,
        message,
        service: SERVICE_NAME,
        data,
        timestamp: new Date().toISOString(),
      };
      emit(entry);

      if (
        options?.elasticsearchUrl &&
        (level === "error" || level === "warn")
      ) {
        const p = shipToElasticsearch(entry, options.elasticsearchUrl);
        if (options.waitUntil) {
          options.waitUntil(p);
        }
      }
    };

  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    debug: log("debug"),
  };
}
