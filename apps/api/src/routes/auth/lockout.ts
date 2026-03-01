import type { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { auditLogs, users } from "../../db/schema";
import type { Env } from "../../types";

export const LOGIN_LOCKOUT_KEY_PREFIX = "login:lockout:";
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_ATTEMPT_TTL_SECONDS = 15 * 60;
export const LOGIN_LOCKOUT_TTL_SECONDS = 30 * 60;
export const LOGIN_LOCKOUT_MS = LOGIN_LOCKOUT_TTL_SECONDS * 1000;

export interface LoginLockoutRecord {
  attempts: number;
  lockedUntil?: number;
}

export function getLoginLockoutKey(phoneHash: string): string {
  return `${LOGIN_LOCKOUT_KEY_PREFIX}${phoneHash}`;
}

export function parseLoginLockoutRecord(
  value: string | null,
): LoginLockoutRecord | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as LoginLockoutRecord;
    if (
      typeof parsed.attempts === "number" &&
      Number.isFinite(parsed.attempts) &&
      parsed.attempts >= 0 &&
      (typeof parsed.lockedUntil === "number" ||
        typeof parsed.lockedUntil === "undefined")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function isExpiredLock(
  record: LoginLockoutRecord | null,
  nowMs: number,
): boolean {
  return typeof record?.lockedUntil === "number" && record.lockedUntil <= nowMs;
}

export function getRetryAfterSeconds(
  lockedUntil: number,
  nowMs: number,
): number {
  return Math.max(1, Math.ceil((lockedUntil - nowMs) / 1000));
}

export function accountLockedResponse(
  c: Context,
  lockedUntil: number,
  nowMs: number,
) {
  const retryAfter = getRetryAfterSeconds(lockedUntil, nowMs);
  return c.json(
    {
      success: false,
      error: {
        code: "ACCOUNT_LOCKED",
        message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
        lockedUntil,
        retryAfter,
      },
      timestamp: new Date().toISOString(),
    },
    429,
    {
      "Retry-After": retryAfter.toString(),
    },
  );
}

export async function recordFailedAttempt(
  kv: Env["KV"],
  key: string,
  record: LoginLockoutRecord | null,
  nowMs: number,
): Promise<LoginLockoutRecord> {
  const attempts = (record?.attempts ?? 0) + 1;
  const updated: LoginLockoutRecord = { attempts };

  if (attempts >= LOGIN_MAX_ATTEMPTS) {
    updated.lockedUntil = nowMs + LOGIN_LOCKOUT_MS;
    await kv.put(key, JSON.stringify(updated), {
      expirationTtl: LOGIN_LOCKOUT_TTL_SECONDS,
    });
    return updated;
  }

  await kv.put(key, JSON.stringify(updated), {
    expirationTtl: LOGIN_ATTEMPT_TTL_SECONDS,
  });
  return updated;
}

export async function resolveLockoutActorId(
  db: ReturnType<typeof drizzle>,
  phoneHash: string,
): Promise<string | null> {
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneHash, phoneHash))
    .get();

  return existingUser?.id ?? null;
}

export async function logLoginLockoutEvent(
  db: ReturnType<typeof drizzle>,
  c: Context,
  actorId: string,
  phoneHash: string,
  attempts: number,
  lockedUntil: number,
) {
  await db.insert(auditLogs).values({
    action: "LOGIN_LOCKOUT",
    actorId,
    targetType: "LOGIN_LOCKOUT",
    targetId: phoneHash,
    reason: JSON.stringify({ attempts, lockedUntil }),
    ip: c.req.header("CF-Connecting-IP") || undefined,
    userAgent: c.req.header("User-Agent") || undefined,
  });
}

export async function getLockoutStatus(
  kv: Env["KV"],
  key: string,
  nowMs: number,
): Promise<LoginLockoutRecord | null> {
  const existingAttempt = parseLoginLockoutRecord(await kv.get(key));
  if (isExpiredLock(existingAttempt, nowMs)) {
    await kv.delete(key);
    return null;
  }
  return existingAttempt;
}

export async function clearLockout(kv: Env["KV"], key: string): Promise<void> {
  await kv.delete(key);
}
