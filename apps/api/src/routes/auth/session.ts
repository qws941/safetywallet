import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { users, attendance, siteMemberships, sites } from "../../db/schema";
import { decrypt } from "../../lib/crypto";
import { signJwt } from "../../lib/jwt";
import { success, error } from "../../lib/response";
import { createLogger } from "../../lib/logger";
import { fasCheckWorkerAttendance } from "../../lib/fas";
import { authMiddleware } from "../../middleware/auth";
import { checkRateLimit } from "../../lib/rate-limit";
import type { Env, AuthContext } from "../../types";
import { getTodayRange } from "../../utils/common";
import { RefreshTokenSchema } from "../../validators/schemas";

const ACCESS_TOKEN_EXPIRY_SECONDS = 86400;
const logger = createLogger("auth");

const sessionRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

sessionRoute.post(
  "/refresh",
  zValidator("json", RefreshTokenSchema),
  async (c) => {
    const body = (() => {
      try {
        return c.req.valid("json");
      } catch {
        return null;
      }
    })();
    if (!body) {
      return error(c, "INVALID_JSON", "Invalid JSON", 400);
    }

    if (!body.refreshToken) {
      return error(c, "MISSING_REFRESH_TOKEN", "refreshToken is required", 400);
    }

    const clientIp =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("x-forwarded-for") ||
      "unknown";
    const refreshRateLimit = await checkRateLimit(
      c.env,
      `refresh:${clientIp}`,
      10,
      60 * 1000,
    );
    if (!refreshRateLimit.allowed) {
      return error(
        c,
        "RATE_LIMITED",
        "Too many refresh attempts. Please try again later.",
        429,
      );
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

    if (
      user.refreshTokenExpiresAt &&
      new Date(user.refreshTokenExpiresAt) < new Date()
    ) {
      await db
        .update(users)
        .set({
          refreshToken: null,
          refreshTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      return error(
        c,
        "REFRESH_TOKEN_EXPIRED",
        "Refresh token has expired",
        401,
      );
    }

    const requireAttendanceOnRefresh =
      c.env.REQUIRE_ATTENDANCE_FOR_LOGIN !== "false";
    if (requireAttendanceOnRefresh && user.role === "WORKER") {
      let attended = false;

      if (c.env.FAS_HYPERDRIVE && user.externalWorkerId) {
        try {
          const now = new Date();
          const koreaTime = new Date(
            now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
          );
          if (koreaTime.getHours() < 5) {
            koreaTime.setDate(koreaTime.getDate() - 1);
          }
          const accsDay = `${koreaTime.getFullYear()}${String(koreaTime.getMonth() + 1).padStart(2, "0")}${String(koreaTime.getDate()).padStart(2, "0")}`;
          const fasResult = await fasCheckWorkerAttendance(
            c.env.FAS_HYPERDRIVE,
            user.externalWorkerId,
            accsDay,
          );
          attended = fasResult.hasAttendance;
        } catch (fasErr) {
          logger.error("FAS realtime attendance check failed during refresh", {
            error: fasErr instanceof Error ? fasErr.message : String(fasErr),
          });
          attended = true;
        }
      } else {
        const { start, end } = getTodayRange();
        const attendanceRecords = await db
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.userId, user.id),
              eq(attendance.result, "SUCCESS"),
            ),
          )
          .limit(100);
        attended = attendanceRecords.some((record) => {
          const checkinTime = record.checkinAt;
          return checkinTime && checkinTime >= start && checkinTime < end;
        });
      }

      if (!attended) {
        await db
          .update(users)
          .set({
            refreshToken: null,
            refreshTokenExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
        return error(
          c,
          "ATTENDANCE_NOT_VERIFIED",
          "오늘 출근 인증이 확인되지 않습니다. 게이트 안면인식 출근 후 이용 가능합니다.",
          403,
        );
      }
    }

    const newRefreshToken = crypto.randomUUID();
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );
    const phoneForToken =
      user.piiViewFull && user.phoneEncrypted
        ? await decrypt(c.env.ENCRYPTION_KEY, user.phoneEncrypted)
        : "";
    const accessToken = await signJwt(
      { sub: user.id, phone: phoneForToken, role: user.role },
      c.env.JWT_SECRET,
    );

    await db
      .update(users)
      .set({
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt,
        updatedAt: new Date(),
      })
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
  },
);

sessionRoute.post(
  "/logout",
  zValidator("json", RefreshTokenSchema),
  async (c) => {
    const body = (() => {
      try {
        return c.req.valid("json");
      } catch {
        return null;
      }
    })();
    if (!body) {
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
  },
);

sessionRoute.get("/me", authMiddleware, async (c) => {
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
    .where(
      and(
        eq(siteMemberships.userId, userId),
        eq(siteMemberships.status, "ACTIVE"),
      ),
    )
    .orderBy(desc(siteMemberships.joinedAt))
    .limit(1);

  let siteId =
    membershipResults.length > 0 ? membershipResults[0].siteId : null;

  if (!siteId) {
    const fallbackSite = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.active, true))
      .limit(1);
    if (fallbackSite.length > 0) {
      siteId = fallbackSite[0].id;
      await db
        .insert(siteMemberships)
        .values({
          userId,
          siteId,
          role: "WORKER",
          status: "ACTIVE",
        })
        .onConflictDoNothing();
    }
  }

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

export default sessionRoute;
