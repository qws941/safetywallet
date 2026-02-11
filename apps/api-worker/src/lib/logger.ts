/**
 * Structured logger for Cloudflare Workers.
 * Outputs JSON to console, which Workers Logs can parse and filter.
 * See #47.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
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

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(module: string): Logger {
  const log =
    (level: LogLevel) => (message: string, data?: Record<string, unknown>) => {
      emit({
        level,
        module,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    };

  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    debug: log("debug"),
  };
}
