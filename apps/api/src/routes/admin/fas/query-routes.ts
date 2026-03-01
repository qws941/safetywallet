import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, inArray, sql, desc, isNull } from "drizzle-orm";
import { users, auditLogs, syncErrors } from "../../../db/schema";
import { success, error } from "../../../lib/response";
import { requireAdmin } from "../helpers";
import {
  fasGetDailyAttendanceRawRows,
  fasGetDailyAttendanceRawSummary,
  resolveFasSource,
} from "../../../lib/fas";
import { chunkArray, IN_QUERY_CHUNK_SIZE, normalizeAccsDay } from "./helpers";
import type { AdminFasBindings, AdminFasVariables } from "./types";

const app = new Hono<{
  Bindings: AdminFasBindings;
  Variables: AdminFasVariables;
}>();

app.get("/fas/search-mariadb", requireAdmin, async (c) => {
  const name = c.req.query("name");
  const phone = c.req.query("phone");
  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);

  if (!name && !phone) {
    return error(c, "VALIDATION_ERROR", "name or phone query param required");
  }

  const hd = c.env.FAS_HYPERDRIVE;
  if (!hd) {
    return error(
      c,
      "SERVICE_UNAVAILABLE",
      "FAS_HYPERDRIVE not configured",
      503,
    );
  }

  try {
    const { fasSearchEmployeeByPhone, fasSearchEmployeeByName } =
      await import("../../../lib/fas");

    let results: unknown[] = [];
    if (phone) {
      const emp = await fasSearchEmployeeByPhone(hd, phone, source);
      results = emp ? [emp] : [];
    } else if (name) {
      results = await fasSearchEmployeeByName(hd, name, source);
    }

    return success(c, {
      query: { name, phone, source: source.dbName },
      count: results.length,
      results,
    });
  } catch (err) {
    return error(c, "INTERNAL_ERROR", String(err), 500);
  }
});

app.get("/fas/sync-status", requireAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const requestedAccsDayRaw = c.req.query("accsDay") ?? c.req.query("date");
  const requestedAccsDay = normalizeAccsDay(requestedAccsDayRaw);
  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);

  if (requestedAccsDayRaw && !requestedAccsDay) {
    return error(
      c,
      "VALIDATION_ERROR",
      "accsDay/date must be YYYYMMDD or YYYY-MM-DD",
      400,
    );
  }

  const [fasStatus, lastFullSync] = await Promise.all([
    c.env.KV.get("fas-status"),
    c.env.KV.get("fas-last-full-sync"),
  ]);

  const userStatsRow = await db
    .select({
      total: sql<number>`count(*)`,
      fasLinked: sql<number>`sum(case when ${users.externalSystem} = 'FAS' then 1 else 0 end)`,
      missingPhone: sql<number>`sum(case when ${users.phoneHash} is null then 1 else 0 end)`,
      deleted: sql<number>`sum(case when ${users.deletedAt} is not null then 1 else 0 end)`,
    })
    .from(users)
    .get();

  const userStats = {
    total: userStatsRow?.total ?? 0,
    fasLinked: userStatsRow?.fasLinked ?? 0,
    missingPhone: userStatsRow?.missingPhone ?? 0,
    deleted: userStatsRow?.deleted ?? 0,
  };

  const syncErrorRows = await db
    .select({
      status: syncErrors.status,
      count: sql<number>`count(*)`,
    })
    .from(syncErrors)
    .groupBy(syncErrors.status)
    .all();

  const syncErrorCounts = { open: 0, resolved: 0, ignored: 0 };
  for (const row of syncErrorRows) {
    if (row.status === "OPEN") syncErrorCounts.open = row.count;
    else if (row.status === "RESOLVED") syncErrorCounts.resolved = row.count;
    else if (row.status === "IGNORED") syncErrorCounts.ignored = row.count;
  }

  const recentSyncLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      reason: auditLogs.reason,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      inArray(auditLogs.action, [
        "FAS_SYNC_COMPLETED",
        "FAS_SYNC_FAILED",
        "FAS_WORKERS_SYNCED",
      ]),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(20)
    .all();

  let integrity: {
    accsDay: string;
    fas: {
      source: string;
      totalRows: number;
      checkins: number;
      uniqueWorkers: number;
    };
    d1: {
      linkedWorkers: number;
    };
    gaps: {
      unlinkedWorkers: number;
    };
  } | null = null;

  if (requestedAccsDay) {
    if (!c.env.FAS_HYPERDRIVE) {
      return error(
        c,
        "SERVICE_UNAVAILABLE",
        "FAS_HYPERDRIVE not configured",
        503,
      );
    }

    const rawSummary = await fasGetDailyAttendanceRawSummary(
      c.env.FAS_HYPERDRIVE,
      requestedAccsDay,
      source.siteCd,
      source,
    );
    const workerIds = rawSummary.workerIds.map(
      (workerId) => `${source.workerIdPrefix}${workerId}`,
    );

    let linkedWorkers = 0;
    for (const chunk of chunkArray(workerIds, IN_QUERY_CHUNK_SIZE)) {
      if (chunk.length === 0) continue;
      const linkedChunk = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.externalSystem, "FAS"),
            inArray(users.externalWorkerId, chunk),
            isNull(users.deletedAt),
          ),
        )
        .all();
      linkedWorkers += linkedChunk.length;
    }

    integrity = {
      accsDay: requestedAccsDay,
      fas: {
        source: rawSummary.source,
        totalRows: rawSummary.totalRows,
        checkins: rawSummary.checkins,
        uniqueWorkers: rawSummary.uniqueWorkers,
      },
      d1: {
        linkedWorkers,
      },
      gaps: {
        unlinkedWorkers: Math.max(rawSummary.uniqueWorkers - linkedWorkers, 0),
      },
    };
  }

  return success(c, {
    fasStatus,
    lastFullSync,
    userStats,
    syncErrorCounts,
    requestedAccsDay: requestedAccsDay ?? null,
    requestedSiteCd: source.siteCd,
    requestedSource: source.dbName,
    integrity,
    recentSyncLogs: recentSyncLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : null,
    })),
  });
});

app.get("/fas/raw-attendance", requireAdmin, async (c) => {
  const requestedAccsDayRaw = c.req.query("accsDay") ?? c.req.query("date");
  const requestedAccsDay = normalizeAccsDay(requestedAccsDayRaw);
  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);
  const limitRaw = c.req.query("limit");
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 200;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(1000, Math.max(1, parsedLimit))
    : 200;

  if (!requestedAccsDay) {
    return error(
      c,
      "VALIDATION_ERROR",
      "accsDay/date must be YYYYMMDD or YYYY-MM-DD",
      400,
    );
  }

  if (!c.env.FAS_HYPERDRIVE) {
    return error(
      c,
      "SERVICE_UNAVAILABLE",
      "FAS_HYPERDRIVE not configured",
      503,
    );
  }

  const raw = await fasGetDailyAttendanceRawRows(
    c.env.FAS_HYPERDRIVE,
    requestedAccsDay,
    source.siteCd,
    limit,
    source,
  );

  return success(c, {
    requestedAccsDay,
    requestedSiteCd: source.siteCd,
    requestedSource: source.dbName,
    source: raw.source,
    count: raw.rows.length,
    rows: raw.rows,
  });
});

export default app;
