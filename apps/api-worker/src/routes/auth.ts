import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { users, attendance, siteMemberships } from "../db/schema";
import { hmac } from "../lib/crypto";
import { signJwt } from "../lib/jwt";
import { success, error } from "../lib/response";
import { authMiddleware } from "../middleware/auth";
import type { Env, AuthContext } from "../types";

const ACCESS_TOKEN_EXPIRY_SECONDS = 86400;
const DAY_CUTOFF_HOUR = 5;
const LOGIN_ATTEMPT_KEY_PREFIX = "login_attempts:";
const LOGIN_LOCK_15_MIN_THRESHOLD = 5;
const LOGIN_LOCK_1_HOUR_THRESHOLD = 10;
const LOGIN_LOCK_ADMIN_THRESHOLD = 20;
const LOGIN_LOCK_15_MIN_MS = 15 * 60 * 1000;
const LOGIN_LOCK_1_HOUR_MS = 60 * 60 * 1000;
const LOGIN_MIN_RESPONSE_MS = 350;

interface LoginBody {
  name: string;
  phone: string;
  dob: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface LoginAttemptRecord {
  count: number;
  lastAttempt: string;
  lockUntil: string | null;
}

function getLoginAttemptKey(phoneHash: string): string {
  return `${LOGIN_ATTEMPT_KEY_PREFIX}${phoneHash}`;
}

function parseLoginAttemptRecord(
  value: string | null,
): LoginAttemptRecord | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as LoginAttemptRecord;
    if (
      typeof parsed.count === "number" &&
      Number.isFinite(parsed.count) &&
      typeof parsed.lastAttempt === "string" &&
      (typeof parsed.lockUntil === "string" || parsed.lockUntil === null)
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveLockState(
  record: LoginAttemptRecord | null,
  nowMs: number,
): { locked: boolean; reason?: "TEMP_15" | "TEMP_60" | "ADMIN" } {
  if (!record) {
    return { locked: false };
  }

  if (record.count >= LOGIN_LOCK_ADMIN_THRESHOLD) {
    return { locked: true, reason: "ADMIN" };
  }

  if (record.lockUntil) {
    const lockUntilMs = Date.parse(record.lockUntil);
    if (!Number.isNaN(lockUntilMs) && lockUntilMs > nowMs) {
      if (record.count >= LOGIN_LOCK_1_HOUR_THRESHOLD) {
        return { locked: true, reason: "TEMP_60" };
      }
      if (record.count >= LOGIN_LOCK_15_MIN_THRESHOLD) {
        return { locked: true, reason: "TEMP_15" };
      }
      return { locked: true, reason: "TEMP_15" };
    }
  }

  return { locked: false };
}

async function recordFailedLoginAttempt(
  kv: Env["KV"],
  key: string,
  record: LoginAttemptRecord | null,
  nowMs: number,
): Promise<LoginAttemptRecord> {
  const nextCount = (record?.count ?? 0) + 1;
  let lockUntil: string | null = null;

  if (nextCount >= LOGIN_LOCK_ADMIN_THRESHOLD) {
    lockUntil = null;
  } else if (nextCount >= LOGIN_LOCK_1_HOUR_THRESHOLD) {
    lockUntil = new Date(nowMs + LOGIN_LOCK_1_HOUR_MS).toISOString();
  } else if (nextCount >= LOGIN_LOCK_15_MIN_THRESHOLD) {
    lockUntil = new Date(nowMs + LOGIN_LOCK_15_MIN_MS).toISOString();
  }

  const updated: LoginAttemptRecord = {
    count: nextCount,
    lastAttempt: new Date(nowMs).toISOString(),
    lockUntil,
  };

  await kv.put(key, JSON.stringify(updated));
  return updated;
}

async function enforceMinimumResponseTime(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = LOGIN_MIN_RESPONSE_MS - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const koreaTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );

  if (koreaTime.getHours() < DAY_CUTOFF_HOUR) {
    koreaTime.setDate(koreaTime.getDate() - 1);
  }

  const start = new Date(koreaTime);
  start.setHours(DAY_CUTOFF_HOUR, 0, 0, 0);

  const end = new Date(koreaTime);
  end.setDate(end.getDate() + 1);
  end.setHours(DAY_CUTOFF_HOUR, 0, 0, 0);

  return { start, end };
}

const auth = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

auth.post("/login", async (c) => {
  const startedAt = Date.now();
  const respondWithDelay = async (response: Response) => {
    await enforceMinimumResponseTime(startedAt);
    return response;
  };

  let body: LoginBody;
  try {
    body = await c.req.json();
  } catch {
    return respondWithDelay(error(c, "INVALID_JSON", "Invalid JSON", 400));
  }

  if (!body.name || !body.phone || !body.dob) {
    return respondWithDelay(
      error(c, "MISSING_FIELDS", "name, phone, and dob are required", 400),
    );
  }

  const clientIp = c.req.header("CF-Connecting-IP") || "unknown";

  const now = Date.now();
  const rateLimit = rateLimitMap.get(clientIp);
  if (rateLimit && rateLimit.resetAt > now && rateLimit.count >= 5) {
    return respondWithDelay(
      error(
        c,
        "RATE_LIMIT_EXCEEDED",
        "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
        429,
      ),
    );
  }

  if (!rateLimit || rateLimit.resetAt <= now) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + 60000 });
  } else {
    rateLimit.count++;
  }

  const db = drizzle(c.env.DB);
  const normalizedPhone = body.phone.replace(/[^0-9]/g, "");
  const phoneHash = await hmac(c.env.HMAC_SECRET, normalizedPhone);
  const attemptKey = getLoginAttemptKey(phoneHash);
  const existingAttempt = parseLoginAttemptRecord(
    await c.env.KV.get(attemptKey),
  );
  const lockState = resolveLockState(existingAttempt, Date.now());
  if (lockState.locked) {
    const message =
      lockState.reason === "ADMIN"
        ? "계정이 잠금 상태입니다. 관리자에게 문의하세요."
        : lockState.reason === "TEMP_60"
          ? "로그인 시도가 너무 많습니다. 1시간 후 다시 시도하세요."
          : "로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.";
    const code =
      lockState.reason === "ADMIN" ? "ACCOUNT_LOCKED_ADMIN" : "ACCOUNT_LOCKED";
    return respondWithDelay(error(c, code, message, 423));
  }
  const dobHash = await hmac(c.env.HMAC_SECRET, body.dob);

  const userResults = await db
    .select()
    .from(users)
    .where(and(eq(users.phoneHash, phoneHash), eq(users.dobHash, dobHash)))
    .limit(1);

  if (userResults.length === 0) {
    const updatedAttempt = await recordFailedLoginAttempt(
      c.env.KV,
      attemptKey,
      existingAttempt,
      Date.now(),
    );
    if (updatedAttempt.count >= LOGIN_LOCK_ADMIN_THRESHOLD) {
      return respondWithDelay(
        error(
          c,
          "ACCOUNT_LOCKED_ADMIN",
          "계정이 잠금 상태입니다. 관리자에게 문의하세요.",
          423,
        ),
      );
    }
    if (updatedAttempt.count >= LOGIN_LOCK_1_HOUR_THRESHOLD) {
      return respondWithDelay(
        error(
          c,
          "ACCOUNT_LOCKED",
          "로그인 시도가 너무 많습니다. 1시간 후 다시 시도하세요.",
          423,
        ),
      );
    }
    if (updatedAttempt.count >= LOGIN_LOCK_15_MIN_THRESHOLD) {
      return respondWithDelay(
        error(
          c,
          "ACCOUNT_LOCKED",
          "로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.",
          423,
        ),
      );
    }

    return respondWithDelay(
      error(
        c,
        "USER_NOT_FOUND",
        "등록되지 않은 사용자입니다. 현장 관리자에게 문의하세요.",
        401,
      ),
    );
  }

  const user = userResults[0];
  const normalizedInputName = body.name.trim().toLowerCase();
  const normalizedUserName = (user.name || "").trim().toLowerCase();

  if (normalizedUserName !== normalizedInputName) {
    const updatedAttempt = await recordFailedLoginAttempt(
      c.env.KV,
      attemptKey,
      existingAttempt,
      Date.now(),
    );
    if (updatedAttempt.count >= LOGIN_LOCK_ADMIN_THRESHOLD) {
      return respondWithDelay(
        error(
          c,
          "ACCOUNT_LOCKED_ADMIN",
          "계정이 잠금 상태입니다. 관리자에게 문의하세요.",
          423,
        ),
      );
    }
    if (updatedAttempt.count >= LOGIN_LOCK_1_HOUR_THRESHOLD) {
      return respondWithDelay(
        error(
          c,
          "ACCOUNT_LOCKED",
          "로그인 시도가 너무 많습니다. 1시간 후 다시 시도하세요.",
          423,
        ),
      );
    }
    if (updatedAttempt.count >= LOGIN_LOCK_15_MIN_THRESHOLD) {
      return respondWithDelay(
        error(
          c,
          "ACCOUNT_LOCKED",
          "로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.",
          423,
        ),
      );
    }

    return respondWithDelay(
      error(c, "NAME_MISMATCH", "이름이 일치하지 않습니다.", 401),
    );
  }

  const requireAttendance = c.env.REQUIRE_ATTENDANCE_FOR_LOGIN !== "false";
  if (requireAttendance) {
    const { start, end } = getTodayRange();
    const attendanceRecords = await db
      .select()
      .from(attendance)
      .where(
        and(eq(attendance.userId, user.id), eq(attendance.result, "SUCCESS")),
      )
      .limit(100);

    const attended = attendanceRecords.some((record) => {
      const checkinTime = record.checkinAt;
      return checkinTime && checkinTime >= start && checkinTime < end;
    });

    if (!attended) {
      return respondWithDelay(
        error(
          c,
          "ATTENDANCE_NOT_VERIFIED",
          "오늘 출근 인증이 확인되지 않습니다. 게이트 안면인식 출근 후 이용 가능합니다.",
          403,
        ),
      );
    }
  }

  const accessToken = await signJwt(
    { sub: user.id, phone: user.phone || "", role: user.role },
    c.env.JWT_SECRET,
  );
  const refreshToken = crypto.randomUUID();

  await db
    .update(users)
    .set({ refreshToken, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await c.env.KV.delete(attemptKey);

  return respondWithDelay(
    success(
      c,
      {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name,
          nameMasked: user.nameMasked,
        },
      },
      200,
    ),
  );
});

auth.post("/refresh", async (c) => {
  let body: RefreshBody;
  try {
    body = await c.req.json();
  } catch {
    return error(c, "INVALID_JSON", "Invalid JSON", 400);
  }

  if (!body.refreshToken) {
    return error(c, "MISSING_REFRESH_TOKEN", "refreshToken is required", 400);
  }

  const db = drizzle(c.env.DB);

  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.refreshToken, body.refreshToken))
    .limit(1);

  if (userResults.length === 0) {
    return error(c, "INVALID_REFRESH_TOKEN", "Invalid refresh token", 401);
  }

  const user = userResults[0];
  const newRefreshToken = crypto.randomUUID();
  const accessToken = await signJwt(
    { sub: user.id, phone: user.phone || "", role: user.role },
    c.env.JWT_SECRET,
  );

  await db
    .update(users)
    .set({ refreshToken: newRefreshToken, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return success(
    c,
    {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    },
    200,
  );
});

auth.post("/logout", async (c) => {
  let body: RefreshBody;
  try {
    body = await c.req.json();
  } catch {
    return error(c, "INVALID_JSON", "Invalid JSON", 400);
  }

  if (!body.refreshToken) {
    return error(c, "MISSING_REFRESH_TOKEN", "refreshToken is required", 400);
  }

  const db = drizzle(c.env.DB);

  await db
    .update(users)
    .set({ refreshToken: null, updatedAt: new Date() })
    .where(eq(users.refreshToken, body.refreshToken));

  return success(c, { message: "Logged out successfully" }, 200);
});

auth.get("/me", authMiddleware, async (c) => {
  const authContext = c.get("auth");
  if (!authContext) {
    throw new HTTPException(401, { message: "인증이 필요합니다." });
  }

  const db = drizzle(c.env.DB);
  const userId = authContext.user.id;

  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResults.length === 0) {
    throw new HTTPException(404, { message: "사용자를 찾을 수 없습니다." });
  }

  const user = userResults[0];

  const membershipResults = await db
    .select()
    .from(siteMemberships)
    .where(eq(siteMemberships.userId, userId))
    .limit(1);

  const siteId =
    membershipResults.length > 0 ? membershipResults[0].siteId : "";

  const { start, end } = getTodayRange();
  const attendanceRecords = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), eq(attendance.result, "SUCCESS")))
    .limit(100);

  const todayAttendance = attendanceRecords.find((record) => {
    const checkinTime = record.checkinAt;
    return checkinTime && checkinTime >= start && checkinTime < end;
  });

  return success(
    c,
    {
      id: user.id,
      name: user.name || "",
      nameMasked: user.nameMasked || "",
      role: user.role,
      siteId,
      permissions: [
        user.piiViewFull ? "PII_VIEW_FULL" : "PII_VIEW_MASKED",
        user.canAwardPoints ? "AWARD_POINTS" : "",
        user.canManageUsers ? "MANAGE_USERS" : "",
      ].filter(Boolean),
      todayAttendance: todayAttendance
        ? { checkinAt: todayAttendance.checkinAt.toISOString() }
        : null,
    },
    200,
  );
});

export default auth;
