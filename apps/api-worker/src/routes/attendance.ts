import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { attendance, users, siteMemberships } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { logAuditWithContext } from "../lib/audit";
import { success, error } from "../lib/response";
import type { Env, AuthContext } from "../types";
import { getTodayRange } from "../utils/common";
import {
  AttendanceSyncBodySchema,
  type AttendanceSyncEvent,
} from "../validators/fas-sync";
import { createLogger } from "../lib/logger";
import { dbBatchChunked } from "../db/helpers";
import {
  fasCheckWorkerAttendance,
  fasGetDailyAttendance,
  fasGetDailyAttendanceRealtimeStats,
  resolveFasSource,
  resolveFasSourceByWorkerId,
} from "../lib/fas-mariadb";

// KV-based idempotency cache (CF Workers isolates don't share memory,
// so in-memory Map is useless — each request runs in a fresh isolate)
const IDEMPOTENCY_TTL = 3600; // 1 hour in seconds
const IN_QUERY_CHUNK_SIZE = 50;

interface SiteAttendanceRecord {
  userId: string | null;
  userName: string;
  checkIn: string | null;
  checkOut: string | null;
  externalWorkerId: string;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toAccsDay(source: Date): string {
  const koreaTime = new Date(
    source.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatAccsDayTime(
  accsDay: string,
  time: string | null,
): string | null {
  if (!time || !/^\d{8}$/.test(accsDay)) {
    return null;
  }
  const hh = time.slice(0, 2).padStart(2, "0");
  const mm = time.slice(2, 4).padStart(2, "0");
  return `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}T${hh}:${mm}:00+09:00`;
}

const attendanceRoute = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

attendanceRoute.post(
  "/sync",
  authMiddleware,
  zValidator("json", AttendanceSyncBodySchema),
  async (c) => {
    const auth = c.get("auth");
    if (
      auth?.user?.role !== "SUPER_ADMIN" &&
      auth?.user?.role !== "SITE_ADMIN"
    ) {
      return c.json(error(c, "FORBIDDEN", "관리자 권한이 필요합니다"), 403);
    }
    const logger = createLogger("attendance");
    const idempotencyKey = c.req.header("Idempotency-Key");
    if (idempotencyKey) {
      const cached = await c.env.KV.get(
        `attendance:idempotency:${idempotencyKey}`,
      );
      if (cached) {
        return success(c, JSON.parse(cached));
      }
    }

    const validatedBody = c.req.valid("json") as
      | { events?: AttendanceSyncEvent[] }
      | undefined;
    const body =
      validatedBody ??
      ((await c.req.raw.clone().json()) as {
        events?: AttendanceSyncEvent[];
      });

    if (!body.events || !Array.isArray(body.events)) {
      return error(c, "MISSING_EVENTS", "events array is required", 400);
    }

    const { events } = body;
    const db = drizzle(c.env.DB);

    const results = [];
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    // BATCH FIX: Load all users at once instead of per-event
    const uniqueWorkerIds = [...new Set(events.map((e) => e.fasUserId))];
    const userMap = new Map<string, typeof users.$inferSelect>();

    if (uniqueWorkerIds.length > 0) {
      for (const workerIdChunk of chunkArray(
        uniqueWorkerIds,
        IN_QUERY_CHUNK_SIZE,
      )) {
        const userRecords = await db
          .select()
          .from(users)
          .where(inArray(users.externalWorkerId, workerIdChunk));

        for (const user of userRecords) {
          if (user.externalWorkerId) {
            userMap.set(user.externalWorkerId, user);
          }
        }
      }
    }

    // BATCH FIX: Check all existing attendance at once
    const attendanceKeys = events
      .filter((e) => e.siteId) // Filter out events without siteId
      .map((e) => ({
        workerId: e.fasUserId,
        siteId: e.siteId as string, // Guaranteed non-null by filter
        checkinAt: new Date(e.checkinAt),
      }));

    const existingSet = new Set<string>();
    if (attendanceKeys.length > 0) {
      for (const attendanceChunk of chunkArray(
        attendanceKeys,
        IN_QUERY_CHUNK_SIZE,
      )) {
        const conditions = attendanceChunk.map((key) =>
          and(
            eq(attendance.externalWorkerId, key.workerId),
            eq(attendance.siteId, key.siteId),
            eq(attendance.checkinAt, key.checkinAt),
          ),
        );

        const existing = await db
          .select({
            workerId: attendance.externalWorkerId,
            siteId: attendance.siteId,
            checkinAt: attendance.checkinAt,
          })
          .from(attendance)
          .where(or(...conditions));

        for (const record of existing) {
          if (record.workerId && record.siteId && record.checkinAt) {
            existingSet.add(
              `${record.workerId}|${record.siteId}|${record.checkinAt.getTime()}`,
            );
          }
        }
      }
    }

    // BATCH FIX: Prepare batch insert instead of individual inserts
    const insertBatch: (typeof attendance.$inferInsert)[] = [];
    for (const event of events) {
      const user = userMap.get(event.fasUserId);
      if (!user) {
        results.push({ fasEventId: event.fasEventId, result: "NOT_FOUND" });
        failed++;
        continue;
      }

      if (!event.siteId) {
        results.push({ fasEventId: event.fasEventId, result: "MISSING_SITE" });
        failed++;
        continue;
      }

      const checkinTime = new Date(event.checkinAt);
      const key = `${event.fasUserId}|${event.siteId}|${checkinTime.getTime()}`;

      if (existingSet.has(key)) {
        results.push({ fasEventId: event.fasEventId, result: "DUPLICATE" });
        skipped++;
        logger.debug(
          `[Attendance] Duplicate skipped: ${event.fasUserId} @ ${event.siteId} @ ${checkinTime.toISOString()}`,
        );
      } else {
        insertBatch.push({
          siteId: event.siteId,
          userId: user.id,
          externalWorkerId: event.fasUserId,
          result: "SUCCESS",
          source: "FAS",
          checkinAt: checkinTime,
        });
        results.push({ fasEventId: event.fasEventId, result: "SUCCESS" });
        inserted++;
      }
    }

    // Batch insert all at once
    if (insertBatch.length > 0) {
      try {
        const ops = insertBatch.map((values) =>
          db
            .insert(attendance)
            .values(values)
            .onConflictDoNothing({
              target: [
                attendance.externalWorkerId,
                attendance.siteId,
                attendance.checkinAt,
              ],
            }),
        );
        await dbBatchChunked(db, ops);
      } catch (err) {
        logger.error("Batch insert failed", {
          count: insertBatch.length,
          error: err instanceof Error ? err.message : String(err),
        });
        failed += insertBatch.length;
      }
    }

    const response = {
      processed: results.length,
      inserted,
      skipped,
      failed,
      results,
    };

    if (idempotencyKey) {
      await c.env.KV.put(
        `attendance:idempotency:${idempotencyKey}`,
        JSON.stringify(response),
        { expirationTtl: IDEMPOTENCY_TTL },
      );
    }

    try {
      await logAuditWithContext(
        c,
        db,
        "ATTENDANCE_SYNCED",
        "system",
        "ATTENDANCE",
        idempotencyKey || `attendance-sync:${Date.now()}`,
        {
          processed: response.processed,
          inserted: response.inserted,
          skipped: response.skipped,
          failed: response.failed,
        },
      );
    } catch {
      // Do not block successful sync response on audit failure.
    }

    return success(c, response);
  },
);

attendanceRoute.get("/today", authMiddleware, async (c) => {
  const auth = c.get("auth");
  const db = drizzle(c.env.DB);
  const hyperdrive = c.env.FAS_HYPERDRIVE;
  if (!hyperdrive) {
    return error(
      c,
      "FAS_UNAVAILABLE",
      "FAS Hyperdrive binding not configured",
      503,
    );
  }

  const user = await db
    .select({ externalWorkerId: users.externalWorkerId })
    .from(users)
    .where(and(eq(users.id, auth.user.id), isNull(users.deletedAt)))
    .get();

  if (!user?.externalWorkerId) {
    return success(c, {
      hasAttendance: false,
      records: [],
    });
  }

  const { start } = getTodayRange();
  const todayAccsDay = toAccsDay(start);
  const { source, rawEmplCd } = resolveFasSourceByWorkerId(
    user.externalWorkerId,
  );
  const attendanceResult = await fasCheckWorkerAttendance(
    hyperdrive,
    rawEmplCd,
    todayAccsDay,
    source,
  );

  return success(c, {
    hasAttendance: attendanceResult.hasAttendance,
    records: attendanceResult.records.map((record) => ({
      externalWorkerId: `${source.workerIdPrefix}${record.emplCd}`,
      accsDay: record.accsDay,
      source: "FAS_REALTIME",
      checkinAt: formatAccsDayTime(record.accsDay, record.inTime),
      checkoutAt: formatAccsDayTime(record.accsDay, record.outTime),
      inTime: record.inTime,
      outTime: record.outTime,
    })),
  });
});

attendanceRoute.get("/site/:siteId/report", authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const { user } = c.get("auth");
  const siteId = c.req.param("siteId");

  // Auth check: SUPER_ADMIN or SITE_ADMIN of this site
  if (user.role !== "SUPER_ADMIN") {
    const membership = await db
      .select()
      .from(siteMemberships)
      .where(
        and(
          eq(siteMemberships.userId, user.id),
          eq(siteMemberships.siteId, siteId),
          eq(siteMemberships.role, "SITE_ADMIN"),
          eq(siteMemberships.status, "ACTIVE"),
        ),
      )
      .get();

    if (!membership) {
      return error(c, "FORBIDDEN", "Site admin access required", 403);
    }
  }

  const hyperdrive = c.env.FAS_HYPERDRIVE;
  if (!hyperdrive) {
    return error(
      c,
      "FAS_UNAVAILABLE",
      "FAS Hyperdrive binding not configured",
      503,
    );
  }

  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);

  const { start } = getTodayRange();
  const dayStarts = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(start);
    dayStart.setUTCDate(dayStart.getUTCDate() - (6 - index));
    return dayStart;
  });

  const dailyRows = await Promise.all(
    dayStarts.map(async (dayStart) => {
      const accsDay = toAccsDay(dayStart);
      const rows = await fasGetDailyAttendance(
        hyperdrive,
        accsDay,
        source.siteCd,
        source,
      );
      return { accsDay, rows };
    }),
  );

  const workerIds = new Set<string>();
  for (const daily of dailyRows) {
    for (const row of daily.rows) {
      workerIds.add(`${source.workerIdPrefix}${row.emplCd}`);
    }
  }

  const linkedUsers =
    workerIds.size === 0
      ? []
      : await db
          .select({
            id: users.id,
            externalWorkerId: users.externalWorkerId,
            name: users.name,
            nameMasked: users.nameMasked,
          })
          .from(users)
          .where(inArray(users.externalWorkerId, [...workerIds]))
          .all();

  const userMap = new Map<
    string,
    { id: string; name: string | null; nameMasked: string | null }
  >();
  for (const linkedUser of linkedUsers) {
    if (!linkedUser.externalWorkerId) {
      continue;
    }
    userMap.set(linkedUser.externalWorkerId, {
      id: linkedUser.id,
      name: linkedUser.name,
      nameMasked: linkedUser.nameMasked,
    });
  }

  const report = dailyRows.map((daily) => {
    const records: SiteAttendanceRecord[] = daily.rows.map((row) => {
      const externalWorkerId = `${source.workerIdPrefix}${row.emplCd}`;
      const linked = userMap.get(externalWorkerId);
      return {
        userId: linked?.id ?? null,
        userName: linked?.name ?? linked?.nameMasked ?? row.emplCd,
        checkIn: formatAccsDayTime(row.accsDay, row.inTime),
        checkOut: formatAccsDayTime(row.accsDay, row.outTime),
        externalWorkerId,
      };
    });

    return {
      date: `${daily.accsDay.slice(0, 4)}-${daily.accsDay.slice(4, 6)}-${daily.accsDay.slice(6, 8)}`,
      records,
    };
  });

  return success(c, report);
});

// Real-time attendance stats from FAS MariaDB via Hyperdrive (bypasses D1 CRON lag)
attendanceRoute.get("/realtime", authMiddleware, async (c) => {
  const hyperdrive = c.env.FAS_HYPERDRIVE;
  if (!hyperdrive) {
    return error(
      c,
      "FAS_UNAVAILABLE",
      "FAS Hyperdrive binding not configured",
      503,
    );
  }

  // KST date: today or from query param (?date=YYYYMMDD or YYYY-MM-DD)
  const dateParam = c.req.query("date");
  let accsDay: string;
  if (dateParam) {
    accsDay = dateParam.replace(/-/g, "");
  } else {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    accsDay = kst.toISOString().slice(0, 10).replace(/-/g, "");
  }

  if (!/^\d{8}$/.test(accsDay)) {
    return error(
      c,
      "INVALID_DATE",
      "Date must be YYYYMMDD or YYYY-MM-DD format",
      400,
    );
  }

  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);

  try {
    const stats = await fasGetDailyAttendanceRealtimeStats(
      hyperdrive,
      accsDay,
      source.siteCd,
      source,
    );

    return success(c, {
      date: accsDay,
      siteCd: source.siteCd,
      siteName: source.d1SiteName,
      ...stats,
      source: source.dbName,
      realtimeDataSource: stats.source,
      metric: {
        key: "checkedInWorkers",
        definition:
          "distinct emplCd with non-empty inTime from access_daily for the selected site/day",
      },
      queriedAt: new Date().toISOString(),
    });
  } catch (err) {
    const logger = createLogger("attendance");
    logger.error("Real-time attendance query failed", {
      accsDay,
      error: err instanceof Error ? err.message : String(err),
    });
    return error(
      c,
      "FAS_QUERY_FAILED",
      "Failed to query FAS attendance data",
      500,
    );
  }
});

export default attendanceRoute;
