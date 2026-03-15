import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WEBHOOK_PREFIXES = ["/api/webhooks", "/webhooks"];

function parseAllowedOrigins(csv: string | undefined): string[] {
  return (csv ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isDevelopmentLocalhostAllowed(env: Env, origin: string): boolean {
  if (env.ENVIRONMENT === "production") {
    return false;
  }

  return (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  );
}

function isAllowedOrigin(env: Env, origin: string): boolean {
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return isDevelopmentLocalhostAllowed(env, origin);
}

function extractOriginFromReferer(referer: string): string | null {
  try {
    const url = new URL(referer);
    return url.origin;
  } catch {
    return null;
  }
}

function hasBearerToken(authorizationHeader: string | undefined): boolean {
  if (!authorizationHeader) {
    return false;
  }

  return /^Bearer\s+\S+$/i.test(authorizationHeader);
}

function isWebhookPath(path: string): boolean {
  return WEBHOOK_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const csrfProtection = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    if ((c.env.ENVIRONMENT ?? "").toLowerCase() !== "production") {
      await next();
      return;
    }

    const method = c.req.method.toUpperCase();

    if (SAFE_METHODS.has(method)) {
      await next();
      return;
    }

    if (hasBearerToken(c.req.header("Authorization"))) {
      await next();
      return;
    }

    if (isWebhookPath(c.req.path)) {
      await next();
      return;
    }

    const origin = c.req.header("Origin");
    if (origin) {
      if (!isAllowedOrigin(c.env, origin)) {
        throw new HTTPException(403, { message: "CSRF validation failed" });
      }

      await next();
      return;
    }

    const referer = c.req.header("Referer");
    if (referer) {
      const refererOrigin = extractOriginFromReferer(referer);
      if (!refererOrigin || !isAllowedOrigin(c.env, refererOrigin)) {
        throw new HTTPException(403, { message: "CSRF validation failed" });
      }

      await next();
      return;
    }

    throw new HTTPException(403, { message: "CSRF validation failed" });
  },
);
