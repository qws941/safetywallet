import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { attendance, pointsLedger, posts } from "../../db/schema";
import { error, success } from "../../lib/response";
import { DAY_CUTOFF_HOUR, parseDateParam, requireAdmin } from "./helpers";

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

function parseTrendDate(value: string, isEndExclusive: boolean): Date | null {
  if (value.length <= 10) {
    const base = new Date(
      `${value}T${String(DAY_CUTOFF_HOUR).padStart(2, "0")}:00:00+09:00`,
    );
    if (Number.isNaN(base.getTime())) {
      return null;
    }
    if (isEndExclusive) {
      base.setDate(base.getDate() + 1);
    }
    return base;
  }

  return parseDateParam(value);
}

function getTrendRange(
  startDate?: string,
  endDate?: string,
): {
  start: Date;
  end: Date;
} | null {
  if (!startDate || !endDate) {
    return null;
  }

  const start = parseTrendDate(startDate, false);
  const end = parseTrendDate(endDate, true);

  if (!start || !end || end <= start) {
    return null;
  }

  return { start, end };
}

function toKstDayKey(source: Date): string {
  const koreaTime = new Date(
    source.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );

  if (koreaTime.getHours() < DAY_CUTOFF_HOUR) {
    koreaTime.setDate(koreaTime.getDate() - 1);
  }

  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

app.get("/trends/posts", requireAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId");
  const range = getTrendRange(c.req.query("startDate"), c.req.query("endDate"));

  if (!range) {
    return error(
      c,
      "INVALID_DATE_RANGE",
      "startDate and endDate are required ISO dates",
      400,
    );
  }

  const conditions: SQL[] = [
    gte(posts.createdAt, range.start),
    lt(posts.createdAt, range.end),
  ];

  if (siteId) {
    conditions.push(eq(posts.siteId, siteId));
  }

  const rows = await db
    .select({
      createdAt: posts.createdAt,
      category: posts.category,
    })
    .from(posts)
    .where(and(...conditions))
    .all();

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.createdAt) {
      continue;
    }
    const dayKey = toKstDayKey(row.createdAt);
    const key = `${dayKey}|${row.category}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const trend = Array.from(counts.entries())
    .map(([key, count]) => {
      const [date, category] = key.split("|");
      return { date, category, count };
    })
    .sort((a, b) =>
      a.date === b.date
        ? (a.category ?? "").localeCompare(b.category ?? "")
        : a.date.localeCompare(b.date),
    );

  return success(c, { trend });
});

app.get("/trends/attendance", requireAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId");
  const range = getTrendRange(c.req.query("startDate"), c.req.query("endDate"));

  if (!range) {
    return error(
      c,
      "INVALID_DATE_RANGE",
      "startDate and endDate are required ISO dates",
      400,
    );
  }

  const conditions: SQL[] = [
    gte(attendance.checkinAt, range.start),
    lt(attendance.checkinAt, range.end),
  ];

  if (siteId) {
    conditions.push(eq(attendance.siteId, siteId));
  }

  const rows = await db
    .select({ checkinAt: attendance.checkinAt })
    .from(attendance)
    .where(and(...conditions))
    .all();

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.checkinAt) {
      continue;
    }
    const dayKey = toKstDayKey(row.checkinAt);
    counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
  }

  const trend = Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return success(c, { trend });
});

app.get("/trends/points", requireAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId");
  const range = getTrendRange(c.req.query("startDate"), c.req.query("endDate"));

  if (!range) {
    return error(
      c,
      "INVALID_DATE_RANGE",
      "startDate and endDate are required ISO dates",
      400,
    );
  }

  const conditions: SQL[] = [
    gte(pointsLedger.createdAt, range.start),
    lt(pointsLedger.createdAt, range.end),
  ];

  if (siteId) {
    conditions.push(eq(pointsLedger.siteId, siteId));
  }

  const distribution = await db
    .select({
      reasonCode: pointsLedger.reasonCode,
      totalAmount: sql<number>`COALESCE(SUM(${pointsLedger.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(pointsLedger)
    .where(and(...conditions))
    .groupBy(pointsLedger.reasonCode)
    .orderBy(desc(sql`COUNT(*)`))
    .all();

  return success(c, { distribution });
});

export default app;
