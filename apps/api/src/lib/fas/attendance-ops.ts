import { createLogger } from "../logger";
import type { HyperdriveBinding } from "../../types";
import { getConnection, queryWithTimeout } from "./connection";
import {
  formatAccsDayWithDash,
  mergeAttendanceRecord,
  sortAttendanceByInTime,
} from "./attendance-helpers";
import { mapToFasAttendance } from "./mappers";
import {
  DEFAULT_FAS_SOURCE,
  tbl,
  type FasAttendance,
  type FasAttendanceRealtimeStats,
  type FasAttendanceSiteCount,
  type FasAttendanceTrendPoint,
  type FasRawAttendanceRowsResult,
  type FasRawAttendanceSummary,
  type FasSource,
} from "./types";

const logger = createLogger("fas-mariadb");

export async function fasGetDailyAttendance(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendance[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const normalizedSiteCd =
      siteCd === undefined || siteCd === null ? null : siteCd;
    const dateWithDash = formatAccsDayWithDash(accsDay);

    const [accessDailyRows] = await queryWithTimeout(
      conn,
      `SELECT ad.empl_cd, ad.accs_day, ad.in_time, ad.out_time,
            ad.state, ad.part_cd
       FROM ${tbl(source, "access_daily")} ad
      WHERE ad.accs_day = ?
        AND ad.in_time IS NOT NULL
        AND ad.in_time != '0000'
        AND ad.in_time != ''${normalizedSiteCd ? " AND ad.site_cd = ?" : ""}`,
      normalizedSiteCd ? [accsDay, normalizedSiteCd] : [accsDay],
    );
    const accessDailyMapped = (
      accessDailyRows as Array<Record<string, unknown>>
    ).map(mapToFasAttendance);

    if (accessDailyMapped.length > 0) {
      return sortAttendanceByInTime(accessDailyMapped);
    }

    logger.debug("FAS daily attendance falling back to raw sources", {
      action: "fas_daily_attendance_fallback",
      source: "access_daily+access+access_history.fallback",
      accsDay,
      siteCd: normalizedSiteCd,
    });

    const byWorker = new Map<string, FasAttendance>();
    const candidates: Array<{ query: string; params: unknown[] }> = [
      {
        query: `SELECT a.empl_cd,
                       DATE_FORMAT(a.accs_dt, '%Y%m%d') AS accs_day,
                       MIN(DATE_FORMAT(a.accs_dt, '%H%i')) AS in_time,
                       MAX(DATE_FORMAT(a.accs_dt, '%H%i')) AS out_time,
                       0 AS state,
                       COALESCE(MAX(a.part_cd), '') AS part_cd
                FROM ${tbl(source, "access")} a
                WHERE DATE(a.accs_dt) = ?${normalizedSiteCd ? " AND a.site_cd = ?" : ""}
                GROUP BY a.empl_cd, DATE_FORMAT(a.accs_dt, '%Y%m%d')`,
        params: normalizedSiteCd
          ? [dateWithDash, normalizedSiteCd]
          : [dateWithDash],
      },
      {
        query: `SELECT ah.empl_cd,
                       DATE_FORMAT(ah.accs_dt, '%Y%m%d') AS accs_day,
                       MIN(DATE_FORMAT(ah.accs_dt, '%H%i')) AS in_time,
                       MAX(DATE_FORMAT(ah.accs_dt, '%H%i')) AS out_time,
                       0 AS state,
                       COALESCE(MAX(ah.part_cd), '') AS part_cd
                FROM ${tbl(source, "access_history")} ah
                WHERE DATE(ah.accs_dt) = ?${normalizedSiteCd ? " AND ah.site_cd = ?" : ""}
                GROUP BY ah.empl_cd, DATE_FORMAT(ah.accs_dt, '%Y%m%d')`,
        params: normalizedSiteCd
          ? [dateWithDash, normalizedSiteCd]
          : [dateWithDash],
      },
    ];

    for (const candidate of candidates) {
      try {
        const [rows] = await queryWithTimeout(
          conn,
          candidate.query,
          candidate.params,
        );
        const mapped = (rows as Array<Record<string, unknown>>).map(
          mapToFasAttendance,
        );
        for (const row of mapped) {
          mergeAttendanceRecord(byWorker, row);
        }
      } catch (err) {
        logger.debug("FAS attendance source query failed", {
          action: "fas_daily_attendance_fallback",
          source: candidate.query.slice(0, 32),
          error: { name: "QueryError", message: String(err) },
        });
        continue;
      }
    }

    return sortAttendanceByInTime([...byWorker.values()]);
  } finally {
    await conn.end();
  }
}

export async function fasGetDailyAttendanceRawSummary(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasRawAttendanceSummary> {
  const conn = await getConnection(hyperdrive);
  const dateWithDash = formatAccsDayWithDash(accsDay);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;

  const buildSiteClause = (siteColumn: string) =>
    normalizedSiteCd ? ` AND ${siteColumn} = ?` : "";
  const withSiteParam = (params: unknown[]) =>
    normalizedSiteCd ? [...params, normalizedSiteCd] : params;

  const candidates: Array<{
    source: string;
    query: string;
    params: unknown[];
  }> = [
    {
      source: "access_daily.raw",
      query: `SELECT ad.empl_cd AS empl_cd
           FROM ${tbl(source, "access_daily")} ad
          WHERE ad.accs_day = ?${buildSiteClause("ad.site_cd")}`,
      params: withSiteParam([accsDay]),
    },
    {
      source: "access.raw",
      query: `SELECT a.empl_cd AS empl_cd
           FROM ${tbl(source, "access")} a
          WHERE DATE(a.accs_dt) = ?${buildSiteClause("a.site_cd")}`,
      params: withSiteParam([dateWithDash]),
    },
    {
      source: "access_history.raw",
      query: `SELECT ah.empl_cd AS empl_cd
           FROM ${tbl(source, "access_history")} ah
          WHERE DATE(ah.accs_dt) = ?${buildSiteClause("ah.site_cd")}`,
      params: withSiteParam([dateWithDash]),
    },
  ];

  try {
    const mergedWorkerIds = new Set<string>();
    const successfulSources: string[] = [];
    let totalRows = 0;

    for (const candidate of candidates) {
      try {
        const [rows] = await queryWithTimeout(
          conn,
          candidate.query,
          candidate.params,
        );
        const mapped = rows as Array<Record<string, unknown>>;
        totalRows += mapped.length;
        for (const row of mapped) {
          const workerId = String(row["empl_cd"] || "");
          if (workerId.length > 0) {
            mergedWorkerIds.add(workerId);
          }
        }
        successfulSources.push(candidate.source);
      } catch (err) {
        logger.debug("FAS raw summary source query failed", {
          action: "fas_raw_summary_fallback",
          source: candidate.source,
          error: { name: "QueryError", message: String(err) },
        });
      }
    }

    return {
      source:
        successfulSources.length > 0 ? successfulSources.join("+") : "none",
      totalRows,
      checkins: totalRows,
      uniqueWorkers: mergedWorkerIds.size,
      workerIds: [...mergedWorkerIds],
    };
  } finally {
    await conn.end();
  }
}

export async function fasGetDailyAttendanceRawRows(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  limit = 200,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasRawAttendanceRowsResult> {
  const conn = await getConnection(hyperdrive);
  const dateWithDash = formatAccsDayWithDash(accsDay);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;
  const safeLimit = Math.min(1000, Math.max(1, Math.trunc(limit)));

  const withSiteClause = (siteColumn: string) =>
    normalizedSiteCd ? ` AND ${siteColumn} = ?` : "";

  const withParams = (params: unknown[]) =>
    normalizedSiteCd
      ? [...params, normalizedSiteCd, safeLimit]
      : [...params, safeLimit];

  const candidates: Array<{
    source: string;
    query: string;
    params: unknown[];
  }> = [
    {
      source: "access_daily.raw",
      query: `SELECT *
           FROM ${tbl(source, "access_daily")} ad
          WHERE ad.accs_day = ?${withSiteClause("ad.site_cd")}
          ORDER BY ad.in_time ASC
          LIMIT ?`,
      params: withParams([accsDay]),
    },
    {
      source: "access.raw",
      query: `SELECT *
           FROM ${tbl(source, "access")} a
          WHERE DATE(a.accs_dt) = ?${withSiteClause("a.site_cd")}
          ORDER BY a.accs_dt ASC
          LIMIT ?`,
      params: withParams([dateWithDash]),
    },
    {
      source: "access_history.raw",
      query: `SELECT *
           FROM ${tbl(source, "access_history")} ah
          WHERE DATE(ah.accs_dt) = ?${withSiteClause("ah.site_cd")}
          ORDER BY ah.accs_dt ASC
          LIMIT ?`,
      params: withParams([dateWithDash]),
    },
  ];

  try {
    const successfulSources: string[] = [];
    const mergedRows: Array<Record<string, unknown>> = [];

    for (const candidate of candidates) {
      try {
        const [rows] = await queryWithTimeout(
          conn,
          candidate.query,
          candidate.params,
        );
        const mapped = rows as Array<Record<string, unknown>>;
        mergedRows.push(...mapped);
        successfulSources.push(candidate.source);
      } catch (err) {
        logger.debug("FAS raw rows source query failed", {
          action: "fas_raw_rows_fallback",
          source: candidate.source,
          error: { name: "QueryError", message: String(err) },
        });
      }
    }

    const trimmedRows =
      mergedRows.length > safeLimit
        ? mergedRows.slice(0, safeLimit)
        : mergedRows;

    return {
      source:
        successfulSources.length > 0 ? successfulSources.join("+") : "none",
      rows: trimmedRows,
    };
  } finally {
    await conn.end();
  }
}

export async function fasGetDailyAttendanceRealtimeStats(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendanceRealtimeStats> {
  const conn = await getConnection(hyperdrive);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;
  const dateWithDash = formatAccsDayWithDash(accsDay);

  const withSiteClause = (siteColumn: string) =>
    normalizedSiteCd ? ` AND ${siteColumn} = ?` : "";
  const withParams = (params: unknown[]) =>
    normalizedSiteCd ? [...params, normalizedSiteCd] : params;

  try {
    const checkedInWorkers = new Set<string>();
    const dedupCheckinEvents = new Set<string>();
    const successfulSources: string[] = [];
    let totalRows = 0;

    const candidates = [
      {
        name: "access_daily",
        query: `SELECT ad.empl_cd AS empl_cd,
                CONCAT(ad.accs_day, LPAD(COALESCE(ad.in_time, ''), 4, '0')) AS checkin_key
           FROM ${tbl(source, "access_daily")} ad
          WHERE ad.accs_day = ?${withSiteClause("ad.site_cd")}`,
        params: withParams([accsDay]),
      },
      {
        name: "access",
        query: `SELECT a.empl_cd AS empl_cd,
                DATE_FORMAT(a.accs_dt, '%Y%m%d%H%i') AS checkin_key
           FROM ${tbl(source, "access")} a
          WHERE DATE(a.accs_dt) = ?${withSiteClause("a.site_cd")}`,
        params: withParams([dateWithDash]),
      },
      {
        name: "access_history",
        query: `SELECT ah.empl_cd AS empl_cd,
                DATE_FORMAT(ah.accs_dt, '%Y%m%d%H%i') AS checkin_key
           FROM ${tbl(source, "access_history")} ah
          WHERE DATE(ah.accs_dt) = ?${withSiteClause("ah.site_cd")}`,
        params: withParams([dateWithDash]),
      },
    ];

    for (const candidate of candidates) {
      try {
        const [rows] = await queryWithTimeout(
          conn,
          candidate.query,
          candidate.params,
        );
        const mapped = rows as Array<Record<string, unknown>>;
        totalRows += mapped.length;
        for (const row of mapped) {
          const workerId = String(row["empl_cd"] || "").trim();
          const checkinKey = String(row["checkin_key"] || "").trim();
          if (!workerId || !checkinKey) {
            continue;
          }
          checkedInWorkers.add(workerId);
          dedupCheckinEvents.add(`${workerId}|${checkinKey}`);
        }
        successfulSources.push(candidate.name);
      } catch (err) {
        logger.debug("FAS realtime stats source query failed", {
          action: "fas_realtime_stats_fallback",
          source: candidate.name,
          error: { name: "QueryError", message: String(err) },
        });
      }
    }

    return {
      source:
        successfulSources.length > 0 ? successfulSources.join("+") : "none",
      totalRows,
      checkedInWorkers: checkedInWorkers.size,
      dedupCheckinEvents: dedupCheckinEvents.size,
    };
  } finally {
    await conn.end();
  }
}

export async function fasGetDailyAttendanceSiteCounts(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  limit = 10,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ source: string; siteCounts: FasAttendanceSiteCount[] }> {
  const conn = await getConnection(hyperdrive);
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)));

  try {
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ad.site_cd AS site_cd, COUNT(*) AS cnt
       FROM ${tbl(source, "access_daily")} ad
      WHERE ad.accs_day = ?
      GROUP BY ad.site_cd`,
      [accsDay],
    );

    const siteCounts = (rows as Array<Record<string, unknown>>)
      .map((row) => ({
        siteCd: String(row["site_cd"] || "").trim(),
        rowCount: Number(row["cnt"] || 0),
      }))
      .filter((row) => row.siteCd.length > 0)
      .sort((a, b) => b.rowCount - a.rowCount)
      .slice(0, safeLimit);

    return {
      source: "access_daily",
      siteCounts,
    };
  } finally {
    await conn.end();
  }
}

export async function fasGetAttendanceTrend(
  hyperdrive: HyperdriveBinding,
  startAccsDay: string,
  endAccsDay: string,
  siteCd?: string | null,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendanceTrendPoint[]> {
  const conn = await getConnection(hyperdrive);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;
  const siteClause = normalizedSiteCd ? " AND ad.site_cd = ?" : "";

  const params: unknown[] = [startAccsDay, endAccsDay];
  if (normalizedSiteCd) {
    params.push(normalizedSiteCd);
  }

  try {
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ad.accs_day AS accs_day,
            COUNT(DISTINCT ad.empl_cd) AS cnt
       FROM ${tbl(source, "access_daily")} ad
      WHERE ad.accs_day BETWEEN ? AND ?
        AND ad.in_time IS NOT NULL
        AND ad.in_time != '0000'
        AND ad.in_time != ''${siteClause}
         GROUP BY ad.accs_day
         ORDER BY ad.accs_day ASC`,
      params,
    );

    return (rows as Array<Record<string, unknown>>).map((row) => ({
      date: String(row["accs_day"] || ""),
      count: Number(row["cnt"] || 0),
    }));
  } finally {
    await conn.end();
  }
}
