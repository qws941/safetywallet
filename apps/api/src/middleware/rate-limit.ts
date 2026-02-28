import type { Context, Next } from "hono";
import type { Env } from "../types";
import { createLogger } from "../lib/logger";

const logger = createLogger("rate-limit");

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (c: Context) => string;
}

const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_WINDOW_MS = 60 * 1000;

export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const {
    maxRequests = DEFAULT_MAX_REQUESTS,
    windowMs = DEFAULT_WINDOW_MS,
    keyGenerator = defaultKeyGenerator,
  } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = keyGenerator(c);
    const rateLimiterBinding = c.env.RATE_LIMITER;

    if (!rateLimiterBinding) {
      return next();
    }

    try {
      const id = rateLimiterBinding.idFromName(key);
      const stub = rateLimiterBinding.get(id);
      const response = await stub.fetch("https://rate-limiter/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkLimit",
          key,
          limit: maxRequests,
          windowMs,
        }),
      });

      if (!response.ok) {
        return c.json(
          {
            success: false,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Rate limiter service unavailable",
            },
          },
          503,
        );
      }

      const result = (await response.json()) as {
        allowed: boolean;
        remaining: number;
        resetAt: number;
      };

      const remaining = Number.isFinite(result.remaining)
        ? result.remaining
        : 0;
      const resetAt = Number.isFinite(result.resetAt)
        ? result.resetAt
        : Date.now() + windowMs;

      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", String(Math.max(remaining, 0)));
      c.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

      if (!result.allowed) {
        return c.json(
          {
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: "Too many requests, please try again later",
            },
            timestamp: new Date().toISOString(),
          },
          429,
        );
      }

      return next();
    } catch (err) {
      logger.error("Rate limiter error", {
        error: err instanceof Error ? err.message : String(err),
      });
      // Fail securely on rate limiter error - don't bypass rate limiting
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_ERROR",
            message: "Rate limiting check failed",
          },
        },
        503,
      );
    }
  };
}

function defaultKeyGenerator(c: Context): string {
  const auth = c.get("auth");
  if (auth?.user?.id) {
    return `user:${auth.user.id}`;
  }
  const ip =
    c.req.header("CF-Connecting-IP") ||
    c.req.header("X-Forwarded-For") ||
    "anonymous";
  return `ip:${ip}`;
}

export function authRateLimitMiddleware() {
  return rateLimitMiddleware({
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyGenerator: (c) => {
      const ip =
        c.req.header("CF-Connecting-IP") ||
        c.req.header("X-Forwarded-For") ||
        "anonymous";
      return `auth:${ip}`;
    },
  });
}
