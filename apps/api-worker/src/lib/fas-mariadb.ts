import mysql from "mysql2/promise";
import { createLogger } from "./logger";
import type { HyperdriveBinding } from "../types";
import { FasGetUpdatedEmployeesParamsSchema } from "../validators/fas-sync";

/** Configuration for a FAS data source (one MariaDB database) */
export interface FasSource {
  /** MariaDB database name (used for cross-DB table qualification) */
  dbName: string;
  /** AceTime site_cd value in this database */
  siteCd: string;
  /** Display name for D1 site record */
  d1SiteName: string;
  /** Prefix for D1 externalWorkerId to prevent cross-DB collisions.
   *  Empty string for the default/primary DB. */
  workerIdPrefix: string;
}

/** Hyperdrive connects to this database - queries to it don't need qualification */
let HYPERDRIVE_DB = "mdidev";

/** All configured FAS data sources. First entry is the default. */
export let FAS_SOURCES: readonly FasSource[] = [
  {
    dbName: "mdidev",
    siteCd: "10",
    d1SiteName: "송도세브란스",
    workerIdPrefix: "",
  },
];

export let DEFAULT_FAS_SOURCE: FasSource = FAS_SOURCES[0];

/** Initialize FAS config from environment variables (removes hardcoding) */
export function initFasConfig(env: {
  FAS_DB_NAME?: string;
  FAS_SITE_CD?: string;
  FAS_SITE_NAME?: string;
}): void {
  const dbName = env.FAS_DB_NAME ?? "mdidev";
  const siteCd = env.FAS_SITE_CD ?? "10";
  const siteName = env.FAS_SITE_NAME ?? "송도세브란스";

  HYPERDRIVE_DB = dbName;
  FAS_SOURCES = [{ dbName, siteCd, d1SiteName: siteName, workerIdPrefix: "" }];
  DEFAULT_FAS_SOURCE = FAS_SOURCES[0];
}

export function resolveFasSource(dbName?: string | null): FasSource {
  if (!dbName) return DEFAULT_FAS_SOURCE;
  const found = FAS_SOURCES.find((s) => s.dbName === dbName);
  return found ?? DEFAULT_FAS_SOURCE;
}

export function resolveFasSourceByWorkerId(externalWorkerId: string): {
  source: FasSource;
  rawEmplCd: string;
} {
  for (const s of FAS_SOURCES) {
    if (s.workerIdPrefix && externalWorkerId.startsWith(s.workerIdPrefix)) {
      return {
        source: s,
        rawEmplCd: externalWorkerId.slice(s.workerIdPrefix.length),
      };
    }
  }
  return { source: DEFAULT_FAS_SOURCE, rawEmplCd: externalWorkerId };
}

type MysqlQueryParams = ReadonlyArray<unknown> | Record<string, unknown>;

interface MysqlConnection {
  ping(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, values?: MysqlQueryParams): Promise<[unknown, unknown]>;
}

const logger = createLogger("fas-mariadb");

/**
 * Qualify a table name with database prefix for cross-DB queries.
 * Tables in the Hyperdrive database (jeil_cmi) don't need qualification.
 */
function tbl(source: FasSource, table: string): string {
  return source.dbName === HYPERDRIVE_DB ? table : `${source.dbName}.${table}`;
}

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

export interface FasAttendanceTrendPoint {
  date: string;
  count: number;
}

export interface FasAttendanceListRecord {
  emplCd: string;
  name: string;
  partCd: string;
  companyName: string;
  inTime: string | null;
  outTime: string | null;
  accsDay: string;
}

interface PooledConnection {
  connection: MysqlConnection;
  lastUsed: number;
}

const connectionCache = new Map<string, PooledConnection>();
const CACHE_TIMEOUT_MS = 30 * 1000; // 30 seconds TTL for cached connections
const FAS_QUERY_TIMEOUT_MS = 10 * 1000; // 10 seconds max per FAS query

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
      await Promise.race([
        cached.connection.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("FAS ping timeout")), 5000),
        ),
      ]);
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

/**
 * Execute a query with timeout protection to prevent worker hangs.
 * Rejects with a timeout error if the query exceeds FAS_QUERY_TIMEOUT_MS.
 */
async function queryWithTimeout(
  conn: MysqlConnection,
  query: string,
  params: unknown[],
  timeoutMs: number = FAS_QUERY_TIMEOUT_MS,
): Promise<[unknown[], unknown]> {
  return Promise.race([
    conn.query(query, params) as Promise<[unknown[], unknown]>,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`FAS query timeout after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

function employeeSelect(): string {
  return `e.empl_cd, e.empl_nm, e.part_cd, e.tel_no, e.social_no,
  e.state_flag, e.entr_day, e.retr_day, e.update_dt,
  e.gojo_cd, e.jijo_cd, e.care_cd, e.role_cd, e.rfid,
  e.viol_cnt, e.viol_yn,
  p.part_nm`;
}

function employeeFrom(source: FasSource): string {
  return `FROM ${tbl(source, "employee")} e
  LEFT JOIN ${tbl(source, "partner")} p ON e.site_cd = p.site_cd AND e.part_cd = p.part_cd`;
}

/**
 * Get a single employee by empl_cd
 */
export async function fasGetEmployeeInfo(
  hyperdrive: HyperdriveBinding,
  emplCd: string,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect()} ${employeeFrom(source)}
     WHERE e.site_cd = ? AND e.empl_cd = ?
     LIMIT 1`,
      [source.siteCd, emplCd],
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
 * Optimizes CRON batch sync by reducing N individual queries to 1.
 */
export async function fasGetEmployeesBatch(
  hyperdrive: HyperdriveBinding,
  emplCds: string[],
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<Map<string, FasEmployee>> {
  if (emplCds.length === 0) {
    return new Map();
  }

  const conn = await getConnection(hyperdrive);
  try {
    const placeholders = emplCds.map(() => "?").join(",");
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect()} ${employeeFrom(source)}
     WHERE e.site_cd = ? AND e.empl_cd IN (${placeholders})`,
      [source.siteCd, ...emplCds],
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
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee[]> {
  // Validate timestamp parameter
  const validated = FasGetUpdatedEmployeesParamsSchema.parse({
    sinceTimestamp,
  });

  const conn = await getConnection(hyperdrive);
  try {
    let query = `SELECT ${employeeSelect()} ${employeeFrom(source)}
      WHERE e.site_cd = ?`;
    const params: unknown[] = [source.siteCd];

    if (validated.sinceTimestamp) {
      query += ` AND e.update_dt > ?`;
      params.push(validated.sinceTimestamp);
    }

    query += ` ORDER BY e.update_dt ASC`;

    const [rows] = await queryWithTimeout(conn, query, params);
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
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ employees: FasEmployee[]; total: number }> {
  const conn = await getConnection(hyperdrive);
  try {
    const [countRows] = await queryWithTimeout(
      conn,
      `SELECT COUNT(*) as cnt ${employeeFrom(source)} WHERE e.site_cd = ?`,
      [source.siteCd],
    );
    const total = (countRows as Array<Record<string, unknown>>)[0]
      .cnt as number;

    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect()} ${employeeFrom(source)}
     WHERE e.site_cd = ?
     ORDER BY e.empl_cd ASC
     LIMIT ? OFFSET ?`,
      [source.siteCd, limit, offset],
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
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendance[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const normalizedSiteCd =
      siteCd === undefined || siteCd === null ? null : siteCd;
    const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;

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
      return accessDailyMapped.sort((a, b) => {
        const aTime = a.inTime ?? "9999";
        const bTime = b.inTime ?? "9999";
        return aTime.localeCompare(bTime);
      });
    }

    logger.debug("FAS daily attendance falling back to raw sources", {
      action: "fas_daily_attendance_fallback",
      source: "access_daily+access+access_history.fallback",
      accsDay,
      siteCd: normalizedSiteCd,
    });

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
  source: FasSource = DEFAULT_FAS_SOURCE,
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
  source: FasSource = DEFAULT_FAS_SOURCE,
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
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasAttendanceRealtimeStats> {
  const conn = await getConnection(hyperdrive);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;
  const dateWithDash = `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}`;

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

export async function fasGetAttendanceList(
  hyperdrive: HyperdriveBinding,
  accsDay: string,
  siteCd?: string | null,
  limit = 50,
  offset = 0,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ records: FasAttendanceListRecord[]; total: number }> {
  const conn = await getConnection(hyperdrive);
  const normalizedSiteCd =
    siteCd === undefined || siteCd === null ? null : siteCd;
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const safeOffset = Math.max(0, Math.trunc(offset));

  const siteClause = normalizedSiteCd ? " AND ad.site_cd = ?" : "";
  const baseParams: unknown[] = [accsDay];
  if (normalizedSiteCd) {
    baseParams.push(normalizedSiteCd);
  }

  try {
    const [countRows] = await queryWithTimeout(
      conn,
      `SELECT COUNT(*) AS cnt
       FROM ${tbl(source, "access_daily")} ad
      WHERE ad.accs_day = ?
        AND ad.in_time IS NOT NULL
        AND ad.in_time != '0000'
        AND ad.in_time != ''${siteClause}`,
      baseParams,
    );

    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ad.empl_cd AS empl_cd,
            COALESCE(e.empl_nm, '') AS empl_nm,
            COALESCE(e.part_cd, ad.part_cd, '') AS part_cd,
            COALESCE(p.part_nm, '') AS part_nm,
            ad.in_time AS in_time,
            ad.out_time AS out_time,
            ad.accs_day AS accs_day
       FROM ${tbl(source, "access_daily")} ad
       LEFT JOIN ${tbl(source, "employee")} e
         ON ad.site_cd = e.site_cd
        AND ad.empl_cd = e.empl_cd
       LEFT JOIN ${tbl(source, "partner")} p
         ON e.site_cd = p.site_cd
        AND e.part_cd = p.part_cd
      WHERE ad.accs_day = ?
        AND ad.in_time IS NOT NULL
        AND ad.in_time != '0000'
        AND ad.in_time != ''${siteClause}
      ORDER BY ad.in_time DESC, ad.empl_cd ASC
      LIMIT ? OFFSET ?`,
      [...baseParams, safeLimit, safeOffset],
    );

    const total = Number(
      (countRows as Array<Record<string, unknown>>)[0]?.cnt || 0,
    );
    const records = (rows as Array<Record<string, unknown>>).map((row) => ({
      emplCd: String(row["empl_cd"] || ""),
      name: String(row["empl_nm"] || ""),
      partCd: String(row["part_cd"] || ""),
      companyName: String(row["part_nm"] || ""),
      inTime: row["in_time"] ? String(row["in_time"]) : null,
      outTime: row["out_time"] ? String(row["out_time"]) : null,
      accsDay: String(row["accs_day"] || ""),
    }));

    return { records, total };
  } finally {
    await conn.end();
  }
}

export async function fasCheckWorkerAttendance(
  hyperdrive: HyperdriveBinding,
  emplCd: string,
  accsDay: string,
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<{ hasAttendance: boolean; records: FasAttendance[] }> {
  const conn = await getConnection(hyperdrive);
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
                FROM ${tbl(source, "access_daily")} ad
               WHERE ad.accs_day = ?
                 AND ad.empl_cd = ?
                 AND ad.in_time IS NOT NULL
                 AND ad.in_time != '0000'
                 AND ad.in_time != ''
                 AND ad.site_cd = ?`,
      params: [accsDay, emplCd, source.siteCd],
    },
    {
      query: `SELECT a.empl_cd,
                     DATE_FORMAT(a.accs_dt, '%Y%m%d') AS accs_day,
                     MIN(DATE_FORMAT(a.accs_dt, '%H%i')) AS in_time,
                     MAX(DATE_FORMAT(a.accs_dt, '%H%i')) AS out_time,
                     0 AS state,
                     COALESCE(MAX(a.part_cd), '') AS part_cd
                FROM ${tbl(source, "access")} a
               WHERE DATE(a.accs_dt) = ?
                 AND a.empl_cd = ?
                 AND a.site_cd = ?
            GROUP BY a.empl_cd, DATE_FORMAT(a.accs_dt, '%Y%m%d')`,
      params: [dateWithDash, emplCd, source.siteCd],
    },
    {
      query: `SELECT ah.empl_cd,
                     DATE_FORMAT(ah.accs_dt, '%Y%m%d') AS accs_day,
                     MIN(DATE_FORMAT(ah.accs_dt, '%H%i')) AS in_time,
                     MAX(DATE_FORMAT(ah.accs_dt, '%H%i')) AS out_time,
                     0 AS state,
                     COALESCE(MAX(ah.part_cd), '') AS part_cd
                FROM ${tbl(source, "access_history")} ah
               WHERE DATE(ah.accs_dt) = ?
                 AND ah.empl_cd = ?
                 AND ah.site_cd = ?
            GROUP BY ah.empl_cd, DATE_FORMAT(ah.accs_dt, '%Y%m%d')`,
      params: [dateWithDash, emplCd, source.siteCd],
    },
  ];

  try {
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
          mergeAttendance(row);
        }
      } catch (err) {
        logger.debug("FAS worker attendance source query failed", {
          action: "fas_worker_attendance_fallback",
          source: candidate.query.slice(0, 32),
          error: { name: "QueryError", message: String(err) },
        });
      }
    }

    const records = [...byWorker.values()].sort((a, b) => {
      const aTime = a.inTime ?? "9999";
      const bTime = b.inTime ?? "9999";
      return aTime.localeCompare(bTime);
    });

    return {
      hasAttendance: records.length > 0,
      records,
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
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee | null> {
  const conn = await getConnection(hyperdrive);
  try {
    const normalizedPhone = phone.replace(/-/g, "");
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect()} ${employeeFrom(source)}
     WHERE e.site_cd = ? AND REPLACE(e.tel_no, '-', '') = ?
     LIMIT 1`,
      [source.siteCd, normalizedPhone],
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
  source: FasSource = DEFAULT_FAS_SOURCE,
): Promise<FasEmployee[]> {
  const conn = await getConnection(hyperdrive);
  try {
    const [rows] = await queryWithTimeout(
      conn,
      `SELECT ${employeeSelect()} ${employeeFrom(source)}
     WHERE e.site_cd = ? AND e.empl_nm LIKE ?`,
      [source.siteCd, `%${name}%`],
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
    await Promise.race([
      conn.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("FAS ping timeout")), 5000),
      ),
    ]);
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
