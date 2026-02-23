import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, gte, lt, and, sql } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { users, sites, posts, siteMemberships } from "../../db/schema";
import { success, error } from "../../lib/response";
import { requireAdmin, getTodayRange } from "./helpers";
import {
  FAS_SOURCES,
  fasGetDailyAttendanceRealtimeStats,
} from "../../lib/fas-mariadb";

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.get("/stats", requireAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const requestedSiteId = c.req.query("siteId")?.trim() || null;

  if (requestedSiteId && user.role === "SITE_ADMIN") {
    const membership = await db
      .select({ role: siteMemberships.role })
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, requestedSiteId),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!membership || membership.role === "WORKER") {
      return error(
        c,
        "MANAGER_ACCESS_REQUIRED",
        "Manager access required",
        403,
      );
    }
  }

  const { start: todayStart, end: todayEnd } = getTodayRange();
  const todayKst = new Date(
    todayStart.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const todayAccsDay = `${todayKst.getFullYear()}${String(todayKst.getMonth() + 1).padStart(2, "0")}${String(todayKst.getDate()).padStart(2, "0")}`;

  const postWhere = requestedSiteId
    ? eq(posts.siteId, requestedSiteId)
    : undefined;
  const todayPostsWhere = requestedSiteId
    ? and(
        eq(posts.siteId, requestedSiteId),
        gte(posts.createdAt, todayStart),
        lt(posts.createdAt, todayEnd),
      )
    : and(gte(posts.createdAt, todayStart), lt(posts.createdAt, todayEnd));
  const pendingWhere = requestedSiteId
    ? and(
        eq(posts.siteId, requestedSiteId),
        sql`${posts.reviewStatus} IN ('PENDING', 'IN_REVIEW')`,
      )
    : sql`${posts.reviewStatus} IN ('PENDING', 'IN_REVIEW')`;
  const urgentWhere = requestedSiteId
    ? and(
        eq(posts.siteId, requestedSiteId),
        eq(posts.isUrgent, true),
        sql`${posts.reviewStatus} NOT IN ('APPROVED', 'REJECTED')`,
      )
    : and(
        eq(posts.isUrgent, true),
        sql`${posts.reviewStatus} NOT IN ('APPROVED', 'REJECTED')`,
      );
  const avgWhere = requestedSiteId
    ? and(
        eq(posts.siteId, requestedSiteId),
        sql`${posts.reviewStatus} IN ('APPROVED', 'REJECTED')`,
      )
    : sql`${posts.reviewStatus} IN ('APPROVED', 'REJECTED')`;

  const userCountQuery = requestedSiteId
    ? db
        .select({
          count: sql<number>`COUNT(DISTINCT ${siteMemberships.userId})`,
        })
        .from(siteMemberships)
        .where(
          and(
            eq(siteMemberships.siteId, requestedSiteId),
            eq(siteMemberships.status, "ACTIVE"),
          ),
        )
    : db.select({ count: sql<number>`COUNT(*)` }).from(users);

  const [
    userCount,
    siteCount,
    postCount,
    activeAttendanceCount,
    pendingCount,
    urgentCount,
    avgProcessingResult,
    categoryDistributionResult,
    todayPostsCount,
  ] = await Promise.all([
    userCountQuery.get(),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(sites)
      .get(),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(posts)
      .where(postWhere)
      .get(),
    (async () => {
      const hd = c.env.FAS_HYPERDRIVE;
      if (!hd) {
        return { count: 0 };
      }
      try {
        let totalCheckedIn = 0;
        for (const source of FAS_SOURCES) {
          const stats = await fasGetDailyAttendanceRealtimeStats(
            hd,
            todayAccsDay,
            source.siteCd,
            source,
          );
          totalCheckedIn += stats.checkedInWorkers;
        }
        return { count: totalCheckedIn };
      } catch {
        return { count: 0 };
      }
    })(),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(posts)
      .where(pendingWhere)
      .get(),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(posts)
      .where(urgentWhere)
      .get(),
    db
      .select({
        avgHours: sql<number>`COALESCE(AVG((${posts.updatedAt} - ${posts.createdAt}) / 3600.0), 0)`,
      })
      .from(posts)
      .where(avgWhere)
      .get(),
    db
      .select({
        category: posts.category,
        count: sql<number>`COUNT(*)`,
      })
      .from(posts)
      .where(postWhere)
      .groupBy(posts.category)
      .all(),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(posts)
      .where(todayPostsWhere)
      .get(),
  ]);

  const categoryDistribution: Record<string, number> = {};
  for (const row of categoryDistributionResult) {
    categoryDistribution[row.category] = row.count;
  }

  return success(c, {
    stats: {
      totalUsers: userCount?.count || 0,
      totalSites: siteCount?.count || 0,
      totalPosts: postCount?.count || 0,
      activeUsersToday: activeAttendanceCount?.count || 0,
      pendingCount: pendingCount?.count || 0,
      urgentCount: urgentCount?.count || 0,
      avgProcessingHours:
        Math.round((avgProcessingResult?.avgHours || 0) * 10) / 10,
      categoryDistribution,
      todayPostsCount: todayPostsCount?.count || 0,
    },
  });
});

export default app;
