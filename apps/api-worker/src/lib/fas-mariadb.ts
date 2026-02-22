import mysql from "mysql2/promise";
import { createLogger } from "./logger";
import type { HyperdriveBinding } from "../types";
import { FasGetUpdatedEmployeesParamsSchema } from "../validators/fas-sync";

// AceTime MariaDB uses EUC-KR charset (jeil_cmi database)
const SITE_CD = "10";

type MysqlQueryParams = ReadonlyArray<unknown> | Record<string, unknown>;

interface MysqlConnection {
  ping(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, values?: MysqlQueryParams): Promise<[unknown, unknown]>;
}

const logger = createLogger("fas-mariadb");

/**
 * AceTime employee record from MariaDB `employee` table
 * Joined with `partner` table for company name
 */
export interface FasEmployee {
  /** 사원코드 (employee.empl_cd) e.g. '24000001' */
  emplCd: string;
  /** 사원명 (employee.empl_nm) e.g. '김우현' */
  name: string;
  /** 협력사코드 (employee.part_cd) FK→partner */
  partCd: string;
  /** 협력사명 (partner.part_nm) e.g. '제일건설' */
  companyName: string;
  /** 전화번호 (employee.tel_no) e.g. '01091865156' */
  phone: string;
  /** 주민번호 앞7자리 (employee.social_no) e.g. '6905281' */
  socialNo: string;
  /** 공종코드 (employee.gojo_cd) FK→gongjong */
  gojoCd: string;
  /** 직종코드 (employee.jijo_cd) FK→jikjong */
  jijoCd: string;
  /** 직책코드 (employee.care_cd) */
  careCd: string;
  /** 역할코드 (employee.role_cd) */
  roleCd: string;
  /** 재직상태 (employee.state_flag) 'W'=재직 */
  stateFlag: string;
  /** 입사일 YYYYMMDD (employee.entr_day) */
  entrDay: string;
  /** 퇴직일 YYYYMMDD (employee.retr_day) */
  retrDay: string;
  /** RFID (employee.rfid) */
  rfid: string;
  /** 위반횟수 (employee.viol_cnt) */
  violCnt: number;
  /** 수정일시 (employee.update_dt) */
  updatedAt: Date;
  /** 재직여부 — derived from state_flag === 'W' */
  isActive: boolean;
}

/**
 * AceTime daily attendance from MariaDB `access_daily` table
 */
export interface FasAttendance {
  /** 사원코드 */
  emplCd: string;
  /** 출근일 YYYYMMDD */
  accsDay: string;
  /** 입장시간 HHMM (null if absent) */
  inTime: string | null;
  /** 퇴장시간 HHMM (null if not checked out) */
  outTime: string | null;
  /** 상태 (0=normal) */
  state: number;
  /** 협력사코드 */
  partCd: string;
}

export interface FasRawAttendanceSummary {
  source: string;
  totalRows: number;
  checkins: number;
  uniqueWorkers: number;
  workerIds: string[];
}

export interface FasRawAttendanceRowsResult {
  source: string;
  rows: Array<Record<string, unknown>>;
}

export interface FasAttendanceRealtimeStats {
  source: string;
  totalRows: number;
  checkedInWorkers: number;
  dedupCheckinEvents: number;
}

export interface FasAttendanceSiteCount {
  siteCd: string;
  rowCount: number;
}

interface PooledConnection {
  connection: MysqlConnection;
  lastUsed: number;
}

const connectionCache = new Map<string, PooledConnection>();
const CACHE_TIMEOUT_MS = 30 * 1000; // 30 seconds TTL for cached connections

/**
 * Get or create a pooled connection with TTL-based caching.
 * Reduces connection overhead from ~5s per query to ~50-100ms.
 * CloudFlare Workers ephemeral nature limits true pooling,
 * but single-connection caching helps significantly.
 */
async function getConnection(
  hyperdrive: HyperdriveBinding,
): Promise<MysqlConnection> {
  const cacheKey = `${hyperdrive.host}:${hyperdrive.port}`;
  const now = Date.now();

  // Check if we have a cached connection that's still alive
  const cached = connectionCache.get(cacheKey);
  if (cached && now - cached.lastUsed < CACHE_TIMEOUT_MS) {
    try {
      // Verify connection is still alive with ping
      await cached.connection.ping();
      cached.lastUsed = now;
      return cached.connection;
    } catch (err) {
      logger.debug("Cached FAS connection ping failed, rotating connection", {
        action: "fas_connection_cache_ping_failed",
        error: { name: "PingError", message: String(err) },
      });
      // Connection is dead, remove from cache
      connectionCache.delete(cacheKey);
    }
  }

  // Create new connection
  const conn = (await mysql.createConnection({
    host: hyperdrive.host,
    port: hyperdrive.port,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    namedPlaceholders: true,
    connectTimeout: 5000,
    disableEval: true,
    waitForConnections: true,
    connectionLimit: 1, // Single connection per isolate
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  })) as unknown as MysqlConnection;

  connectionCache.set(cacheKey, { connection: conn, lastUsed: now });
  return conn;
}

/**
 * Cleanup expired cached connections.
 * Should be called periodically (e.g., in scheduled tasks).
 */
export function cleanupExpiredConnections(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, pooled] of connectionCache.entries()) {
    if (now - pooled.lastUsed > CACHE_TIMEOUT_MS) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    const pooled = connectionCache.get(key);
    if (pooled) {
      pooled.connection.end().catch(() => {
        // Connection already closed, ignore
      });
      connectionCache.delete(key);
    }
  }
}

/** Shared SELECT columns for employee queries */
const EMPLOYEE_SELECT = `
  e.empl_cd, e.empl_nm, e.part_cd, e.tel_no, e.social_no,
  e.state_flag, e.entr_day, e.retr_day, e.update_dt,
  e.gojo_cd, e.jijo_cd, e.care_cd, e.role_cd, e.rfid,
  e.viol_cnt, e.viol_yn,
  p.part_nm`;

/** Shared FROM + JOIN for employee queries */
const EMPLOYEE_FROM = `
  FROM employee e
  LEFT JOIN partner p ON e.site_cd = p.site_cd AND e.part_cd = p.part_cd`;

/**
 * Get a single employee by empl_cd
 */
export async function fasGetEmployeeInfo(
  hyperdrive: HyperdriveBinding,
  emplCd: string,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await conn.query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM}
       WHERE e.site_cd = ? AND e.empl_cd = ?
       LIMIT 1`,
      [SITE_CD, emplCd],
    );
    const results = rows as Array<Record<string, unknown>>;
    if (results.length === 0) {
      return null;
    }
    return mapToFasEmployee(results[0]);
  } finally {
    await conn.end();
  }
}

/**
 * Get multiple employees by empl_cd in a single batch query.
 * Optimizes CRON cross-match sync by reducing N individual queries to 1.
 */
export async function fasGetEmployeesBatch(
  hyperdrive: HyperdriveBinding,
  emplCds: string[],
): Promise<Map<string, FasEmployee>> {
  if (emplCds.length === 0) {
    return new Map();
  }

  const conn = await getConnection(hyperdrive);
  try {
    const placeholders = emplCds.map(() => "?").join(",");
    const [rows] = await conn.query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM}
       WHERE e.site_cd = ? AND e.empl_cd IN (${placeholders})`,
      [SITE_CD, ...emplCds],
    );
    const results = rows as Array<Record<string, unknown>>;
    const map = new Map<string, FasEmployee>();
    for (const row of results) {
      const employee = mapToFasEmployee(row);
      if (employee.emplCd) {
        map.set(employee.emplCd, employee);
      }
    }
    return map;
  } finally {
    await conn.end();
  }
}

/**
 * Get employees updated since a given timestamp (for delta sync).
 * Returns all employees if sinceTimestamp is empty/null.
 */
export async function fasGetUpdatedEmployees(
  hyperdrive: HyperdriveBinding,
  sinceTimestamp: string | null,
): Promise<FasEmployee[]> {
  // Validate timestamp parameter
  const validated = FasGetUpdatedEmployeesParamsSchema.parse({
    sinceTimestamp,
  });

  const conn = await getConnection(hyperdrive);
  try {
    let query = `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM}
      WHERE e.site_cd = ?`;
    const params: unknown[] = [SITE_CD];

    if (validated.sinceTimestamp) {
      query += ` AND e.update_dt > ?`;
      params.push(validated.sinceTimestamp);
    }

    query += ` ORDER BY e.update_dt ASC`;

    const [rows] = await conn.query(query, params);
    const results = rows as Array<Record<string, unknown>>;
    return results.map(mapToFasEmployee);
  } finally {
    await conn.end();
  }
}

/**
 * Get all employees with pagination (for bulk sync).
 */
export async function fasGetAllEmployeesPaginated(
  hyperdrive: HyperdriveBinding,
  offset: number,
  limit: number,
): Promise<{ employees: FasEmployee[]; total: number }> {
  const conn = await getConnection(hyperdrive);
  try {
    const [countRows] = await conn.query(
      `SELECT COUNT(*) as cnt ${EMPLOYEE_FROM} WHERE e.site_cd = ?`,
      [SITE_CD],
    );
    const total = (countRows as Array<Record<string, unknown>>)[0]
      .cnt as number;

    const [rows] = await conn.query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM}
       WHERE e.site_cd = ?
       ORDER BY e.empl_cd ASC
       LIMIT ? OFFSET ?`,
      [SITE_CD, limit, offset],
    );
    const results = rows as Array<Record<string, unknown>>;
    return { employees: results.map(mapToFasEmployee), total };
  } finally {
    await conn.end();
  }
}

/**
 * Get today's attendance records from `access_daily`
 */
export async function fasGetDailyAttendance(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
): Promise<FasAttendance[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const normalizedSiteCd =
      siteCd === undefined || siteCd === null ? null : siteCd;
    const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;

    const byWorker = new Map<string, FasAttendance>();

    const mergeAttendance = (row: FasAttendance) => {
      const key = `${row.emplCd}|${row.accsDay}`;
      const existing = byWorker.get(key);
      if (!existing) {
        byWorker.set(key, row);
        return;
      }

      const mergedInTime =
        existing.inTime && row.inTime
          ? existing.inTime <= row.inTime
            ? existing.inTime
            : row.inTime
          : (existing.inTime ?? row.inTime);
      const mergedOutTime =
        existing.outTime && row.outTime
          ? existing.outTime >= row.outTime
            ? existing.outTime
            : row.outTime
          : (existing.outTime ?? row.outTime);

      byWorker.set(key, {
        ...existing,
        inTime: mergedInTime,
        outTime: mergedOutTime,
        partCd: existing.partCd || row.partCd,
        state: existing.state || row.state,
      });
    };

    const candidates: Array<{ query: string; params: unknown[] }> = [
      {
        query: `SELECT ad.empl_cd, ad.accs_day, ad.in_time, ad.out_time,
                     ad.state, ad.part_cd
              FROM access_daily ad
              WHERE ad.accs_day = ?${normalizedSiteCd ? " AND ad.site_cd = ?" : ""}`,
        params: normalizedSiteCd ? [accsDay, normalizedSiteCd] : [accsDay],
      },
      {
        query: `SELECT a.empl_cd,
                       DATE_FORMAT(a.accs_dt, '%Y%m%d') AS accs_day,
                       MIN(DATE_FORMAT(a.accs_dt, '%H%i')) AS in_time,
                       MAX(DATE_FORMAT(a.accs_dt, '%H%i')) AS out_time,
                       0 AS state,
                       COALESCE(MAX(a.part_cd), '') AS part_cd
                FROM access a
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
                FROM access_history ah
                WHERE DATE(ah.accs_dt) = ?${normalizedSiteCd ? " AND ah.site_cd = ?" : ""}
                GROUP BY ah.empl_cd, DATE_FORMAT(ah.accs_dt, '%Y%m%d')`,
        params: normalizedSiteCd
          ? [dateWithDash, normalizedSiteCd]
          : [dateWithDash],
      },
    ];

    for (const candidate of candidates) {
      try {
        const [rows] = await conn.query(candidate.query, candidate.params);
        const mapped = (rows as Array<Record<string, unknown>>).map(
          mapToFasAttendance,
        );
        for (const row of mapped) {
          mergeAttendance(row);
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

    return [...byWorker.values()].sort((a, b) => {
      const aTime = a.inTime ?? "9999";
      const bTime = b.inTime ?? "9999";
      return aTime.localeCompare(bTime);
    });
  } finally {
    await conn.end();
  }
}

export async function fasGetDailyAttendanceRawSummary(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
): Promise<FasRawAttendanceSummary> {
  const conn = await getConnection(hyperdrive);
  const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;
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
           FROM access_daily ad
          WHERE ad.accs_day = ?${buildSiteClause("ad.site_cd")}`,
      params: withSiteParam([accsDay]),
    },
    {
      source: "access.raw",
      query: `SELECT a.empl_cd AS empl_cd
           FROM access a
          WHERE DATE(a.accs_dt) = ?${buildSiteClause("a.site_cd")}`,
      params: withSiteParam([dateWithDash]),
    },
    {
      source: "access_history.raw",
      query: `SELECT ah.empl_cd AS empl_cd
           FROM access_history ah
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
        const [rows] = await conn.query(candidate.query, candidate.params);
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
        continue;
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
): Promise<FasRawAttendanceRowsResult> {
  const conn = await getConnection(hyperdrive);
  const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;
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
           FROM access_daily ad
          WHERE ad.accs_day = ?${withSiteClause("ad.site_cd")}
          ORDER BY ad.in_time ASC
          LIMIT ?`,
      params: withParams([accsDay]),
    },
    {
      source: "access.raw",
      query: `SELECT *
           FROM access a
          WHERE DATE(a.accs_dt) = ?${withSiteClause("a.site_cd")}
          ORDER BY a.accs_dt ASC
          LIMIT ?`,
      params: withParams([dateWithDash]),
    },
    {
      source: "access_history.raw",
      query: `SELECT *
           FROM access_history ah
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
        const [rows] = await conn.query(candidate.query, candidate.params);
        const mapped = rows as Array<Record<string, unknown>>;
        mergedRows.push(...mapped);
        successfulSources.push(candidate.source);
      } catch (err) {
        logger.debug("FAS raw rows source query failed", {
          action: "fas_raw_rows_fallback",
          source: candidate.source,
          error: { name: "QueryError", message: String(err) },
        });
        continue;
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
): Promise<FasAttendanceRealtimeStats> {
  const conn = await getConnection(hyperdrive);
  const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;

  const withSiteClause = (siteColumn: string) =>
    normalizedSiteCd ? ` AND ${siteColumn} = ?` : "";
  const withParams = (params: unknown[]) =>
    normalizedSiteCd ? [...params, normalizedSiteCd] : params;

  const candidates: Array<{
    source: string;
    query: string;
    params: unknown[];
  }> = [
    {
      source: "access_daily.raw",
      query: `SELECT ad.empl_cd AS empl_cd, CONCAT(ad.accs_day, LPAD(COALESCE(ad.in_time, ''), 4, '0')) AS checkin_key
           FROM access_daily ad
          WHERE ad.accs_day = ?${withSiteClause("ad.site_cd")}
            AND ad.in_time IS NOT NULL`,
      params: withParams([accsDay]),
    },
    {
      source: "access.raw",
      query: `SELECT a.empl_cd AS empl_cd, DATE_FORMAT(a.accs_dt, '%Y%m%d%H%i') AS checkin_key
           FROM access a
          WHERE DATE(a.accs_dt) = ?${withSiteClause("a.site_cd")}`,
      params: withParams([dateWithDash]),
    },
    {
      source: "access_history.raw",
      query: `SELECT ah.empl_cd AS empl_cd, DATE_FORMAT(ah.accs_dt, '%Y%m%d%H%i') AS checkin_key
           FROM access_history ah
          WHERE DATE(ah.accs_dt) = ?${withSiteClause("ah.site_cd")}`,
      params: withParams([dateWithDash]),
    },
  ];

  try {
    const checkedInWorkers = new Set<string>();
    const dedupCheckinEvents = new Set<string>();
    const successfulSources: string[] = [];
    let totalRows = 0;

    for (const candidate of candidates) {
      try {
        const [rows] = await conn.query(candidate.query, candidate.params);
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

        successfulSources.push(candidate.source);
      } catch (err) {
        logger.debug("FAS realtime stats source query failed", {
          action: "fas_realtime_stats_fallback",
          source: candidate.source,
          error: { name: "QueryError", message: String(err) },
        });
        continue;
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
): Promise<{ source: string; siteCounts: FasAttendanceSiteCount[] }> {
  const conn = await getConnection(hyperdrive);
  const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)));

  const candidates: Array<{
    source: string;
    query: string;
    params: unknown[];
  }> = [
    {
      source: "access_daily.raw",
      query: `SELECT ad.site_cd AS site_cd, COUNT(*) AS cnt
           FROM access_daily ad
          WHERE ad.accs_day = ?
          GROUP BY ad.site_cd`,
      params: [accsDay],
    },
    {
      source: "access.raw",
      query: `SELECT a.site_cd AS site_cd, COUNT(*) AS cnt
           FROM access a
          WHERE DATE(a.accs_dt) = ?
          GROUP BY a.site_cd`,
      params: [dateWithDash],
    },
    {
      source: "access_history.raw",
      query: `SELECT ah.site_cd AS site_cd, COUNT(*) AS cnt
           FROM access_history ah
          WHERE DATE(ah.accs_dt) = ?
          GROUP BY ah.site_cd`,
      params: [dateWithDash],
    },
  ];

  try {
    const mergedCounts = new Map<string, number>();
    const successfulSources: string[] = [];

    for (const candidate of candidates) {
      try {
        const [rows] = await conn.query(candidate.query, candidate.params);
        const mapped = rows as Array<Record<string, unknown>>;
        for (const row of mapped) {
          const siteCd = String(row["site_cd"] || "").trim();
          if (!siteCd) {
            continue;
          }
          const cnt = Number(row["cnt"] || 0);
          mergedCounts.set(siteCd, (mergedCounts.get(siteCd) ?? 0) + cnt);
        }
        successfulSources.push(candidate.source);
      } catch (err) {
        logger.debug("FAS site count source query failed", {
          action: "fas_site_counts_fallback",
          source: candidate.source,
          error: { name: "QueryError", message: String(err) },
        });
        continue;
      }
    }

    const siteCounts = [...mergedCounts.entries()]
      .map(([siteCd, rowCount]) => ({ siteCd, rowCount }))
      .sort((a, b) => b.rowCount - a.rowCount)
      .slice(0, safeLimit);

    return {
      source:
        successfulSources.length > 0 ? successfulSources.join("+") : "none",
      siteCounts,
    };
  } finally {
    await conn.end();
  }
}

/**
 * Search employee by phone number (normalized, dashes removed)
 */
export async function fasSearchEmployeeByPhone(
  hyperdrive: HyperdriveBinding,
  phone: string,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const normalizedPhone = phone.replace(/-/g, "");
    const [rows] = await conn.query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM}
       WHERE e.site_cd = ? AND REPLACE(e.tel_no, '-', '') = ?
       LIMIT 1`,
      [SITE_CD, normalizedPhone],
    );
    const results = rows as Array<Record<string, unknown>>;
    if (results.length === 0) {
      return null;
    }
    return mapToFasEmployee(results[0]);
  } finally {
    await conn.end();
  }
}

/** Search FAS employees by name (partial match). */
export async function fasSearchEmployeeByName(
  hyperdrive: HyperdriveBinding,
  name: string,
): Promise<FasEmployee[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await conn.query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM}
       WHERE e.site_cd = ? AND e.empl_nm LIKE ?`,
      [SITE_CD, `%${name}%`],
    );
    return (rows as Array<Record<string, unknown>>).map(mapToFasEmployee);
  } finally {
    await conn.end();
  }
}

function mapToFasEmployee(row: Record<string, unknown>): FasEmployee {
  const stateFlag = String(row["state_flag"] || "");
  return {
    emplCd: String(row["empl_cd"] || ""),
    name: String(row["empl_nm"] || ""),
    partCd: String(row["part_cd"] || ""),
    companyName: String(row["part_nm"] || ""),
    phone: String(row["tel_no"] || ""),
    socialNo: String(row["social_no"] || ""),
    gojoCd: String(row["gojo_cd"] || ""),
    jijoCd: String(row["jijo_cd"] || ""),
    careCd: String(row["care_cd"] || ""),
    roleCd: String(row["role_cd"] || ""),
    stateFlag,
    entrDay: String(row["entr_day"] || ""),
    retrDay: String(row["retr_day"] || ""),
    rfid: String(row["rfid"] || ""),
    violCnt: Number(row["viol_cnt"] || 0),
    updatedAt: row["update_dt"] instanceof Date ? row["update_dt"] : new Date(),
    isActive: stateFlag === "W",
  };
}

function mapToFasAttendance(row: Record<string, unknown>): FasAttendance {
  const inTime = row["in_time"];
  const outTime = row["out_time"];
  return {
    emplCd: String(row["empl_cd"] || ""),
    accsDay: String(row["accs_day"] || ""),
    inTime: inTime ? String(inTime) : null,
    outTime: outTime ? String(outTime) : null,
    state: Number(row["state"] || 0),
    partCd: String(row["part_cd"] || ""),
  };
}

/**
 * Test MariaDB connectivity via Hyperdrive
 */
export async function testConnection(
  hyperdrive: HyperdriveBinding,
): Promise<boolean> {
  try {
    const conn = await getConnection(hyperdrive);
    await conn.ping();
    await conn.end();
    return true;
  } catch (err) {
    logger.warn("FAS connection test failed", {
      action: "fas_connection_test_failed",
      error: { name: "ConnectionError", message: String(err) },
    });
    return false;
  }
}
