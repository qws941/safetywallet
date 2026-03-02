import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { and, inArray, isNull } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import { users } from "../../db/schema";
import {
  fasGetDailyAttendance,
  fasGetAttendanceList,
  type FasAttendance,
  type FasAttendanceListRecord,
  resolveFasSource,
} from "../../lib/fas";
import { success, error } from "../../lib/response";
import { requireManagerOrAdmin, getTodayRange } from "./helpers";

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

interface LinkedUserSummary {
  id: string;
  nameMasked: string | null;
}

const LINKED_USER_QUERY_CHUNK_SIZE = 80;

function toAccsDay(source: Date): string {
  const koreaTime = new Date(
    source.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function resolveAccsDay(dateStr?: string): string | null {
  if (!dateStr) {
    const { start } = getTodayRange();
    return toAccsDay(start);
  }

  if (/^\d{8}$/.test(dateStr)) {
    return dateStr;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.replace(/-/g, "");
  }

  return null;
}

function formatCheckinIso(
  accsDay: string,
  inTime: string | null,
): string | null {
  if (!inTime || !/^\d{8}$/.test(accsDay)) {
    return null;
  }
  const padded = inTime.padStart(4, "0");
  const hh = padded.slice(0, 2).padStart(2, "0");
  const mm = padded.slice(2, 4).padStart(2, "0");
  return `${accsDay.slice(0, 4)}-${accsDay.slice(4, 6)}-${accsDay.slice(6, 8)}T${hh}:${mm}:00+09:00`;
}

function mapLogRecord(
  row: FasAttendanceListRecord,
  userMap: Map<string, LinkedUserSummary>,
  sourcePrefix: string,
) {
  const externalWorkerId = `${sourcePrefix}${row.emplCd}`;
  const linkedUser = userMap.get(externalWorkerId);
  return {
    id: `${row.emplCd}-${row.accsDay}-${row.inTime ?? ""}`,
    siteId: null,
    userId: linkedUser?.id ?? null,
    externalWorkerId,
    checkinAt: formatCheckinIso(row.accsDay, row.inTime),
    result: "SUCCESS",
    source: "FAS_REALTIME",
    createdAt: null,
    userName: linkedUser?.nameMasked ?? row.name,
    companyName: row.companyName,
    partCd: row.partCd,
    inTime: row.inTime,
    outTime: row.outTime,
    accsDay: row.accsDay,
  };
}

function mapFallbackLogRecord(
  row: FasAttendance,
  userMap: Map<string, LinkedUserSummary>,
  sourcePrefix: string,
) {
  const externalWorkerId = `${sourcePrefix}${row.emplCd}`;
  const linkedUser = userMap.get(externalWorkerId);
  return {
    id: `${row.emplCd}-${row.accsDay}-${row.inTime ?? ""}`,
    siteId: null,
    userId: linkedUser?.id ?? null,
    externalWorkerId,
    checkinAt: formatCheckinIso(row.accsDay, row.inTime),
    result: "SUCCESS",
    source: "FAS_REALTIME",
    createdAt: null,
    userName: linkedUser?.nameMasked ?? row.emplCd,
    companyName: null,
    partCd: row.partCd,
    inTime: row.inTime,
    outTime: row.outTime,
    accsDay: row.accsDay,
  };
}

interface UnmatchedSourceRecord {
  emplCd: string;
  accsDay: string;
  inTime: string | null;
  outTime: string | null;
  partCd: string;
  name: string;
  companyName: string | null;
}

// GET /attendance-logs - 출근 기록 조회 (관리자)
app.get("/attendance-logs", requireManagerOrAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = (page - 1) * limit;
  const dateStr = c.req.query("date")?.trim();
  const resultFilter = c.req.query("result");

  if (!siteId) {
    return error(c, "MISSING_SITE", "현장을 선택해주세요", 400);
  }

  const hyperdrive = c.env.FAS_HYPERDRIVE;
  if (!hyperdrive) {
    return error(
      c,
      "SERVICE_UNAVAILABLE",
      "FAS_HYPERDRIVE not configured",
      503,
    );
  }
  const hd = hyperdrive;
  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);

  const accsDay = resolveAccsDay(dateStr);
  if (!accsDay) {
    return error(c, "INVALID_DATE", "date must be YYYYMMDD or YYYY-MM-DD", 400);
  }

  if (resultFilter === "FAIL") {
    return success(c, {
      logs: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  }

  let records: FasAttendanceListRecord[] = [];
  let fallbackRecords: FasAttendance[] = [];
  let total = 0;

  try {
    const result = await fasGetAttendanceList(
      hd,
      accsDay,
      source.siteCd,
      limit,
      offset,
      source,
    );
    records = result.records;
    total = result.total;
  } catch {
    const dailyRecords = await fasGetDailyAttendance(
      hd,
      accsDay,
      source.siteCd,
      source,
    );
    total = dailyRecords.length;
    fallbackRecords = dailyRecords.slice(offset, offset + limit);
  }

  const workerIds = [
    ...new Set(
      (fallbackRecords.length > 0 ? fallbackRecords : records).map(
        (row) => `${source.workerIdPrefix}${row.emplCd}`,
      ),
    ),
  ];
  const linkedUsers: Array<{
    id: string;
    externalWorkerId: string | null;
    nameMasked: string | null;
  }> = [];
  for (
    let start = 0;
    start < workerIds.length;
    start += LINKED_USER_QUERY_CHUNK_SIZE
  ) {
    const chunk = workerIds.slice(start, start + LINKED_USER_QUERY_CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }
    const chunkRows = await db
      .select({
        id: users.id,
        externalWorkerId: users.externalWorkerId,
        nameMasked: users.nameMasked,
      })
      .from(users)
      .where(
        and(inArray(users.externalWorkerId, chunk), isNull(users.deletedAt)),
      )
      .all();
    linkedUsers.push(...chunkRows);
  }

  const userMap = new Map<string, LinkedUserSummary>();
  for (const linkedUser of linkedUsers) {
    if (!linkedUser.externalWorkerId) {
      continue;
    }
    userMap.set(linkedUser.externalWorkerId, {
      id: String(linkedUser.id),
      nameMasked: linkedUser.nameMasked,
    });
  }

  const logs =
    fallbackRecords.length > 0
      ? fallbackRecords.map((row) =>
          mapFallbackLogRecord(row, userMap, source.workerIdPrefix),
        )
      : records.map((row) => mapLogRecord(row, userMap, source.workerIdPrefix));

  return success(c, {
    logs,
    requestedSource: source.dbName,
    requestedSiteCd: source.siteCd,
    requestedSiteName: source.d1SiteName,
    metric: {
      key: "totalLogs",
      definition:
        "row-level attendance logs from access_daily for the selected site/day before UI-side filtering",
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /attendance/unmatched - 사용자 매칭 실패 출근 기록 조회 (관리자)
app.get("/attendance/unmatched", requireManagerOrAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const siteId = c.req.query("siteId");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 2000);
  const offset = (page - 1) * limit;
  const dateStr = c.req.query("date")?.trim();

  if (!siteId) {
    return error(c, "MISSING_SITE", "현장을 선택해주세요", 400);
  }

  const hyperdrive = c.env.FAS_HYPERDRIVE;
  if (!hyperdrive) {
    return error(
      c,
      "SERVICE_UNAVAILABLE",
      "FAS_HYPERDRIVE not configured",
      503,
    );
  }
  const hd = hyperdrive;
  const sourceParam = c.req.query("source");
  const source = resolveFasSource(sourceParam);

  const accsDay = resolveAccsDay(dateStr);
  if (!accsDay) {
    return error(c, "INVALID_DATE", "date must be YYYYMMDD or YYYY-MM-DD", 400);
  }

  let allRecords: UnmatchedSourceRecord[] = [];

  try {
    const fetchedRecords: UnmatchedSourceRecord[] = [];
    let fetchOffset = 0;
    const fetchLimit = 500;
    let total = 0;

    do {
      const pageResult = await fasGetAttendanceList(
        hd,
        accsDay,
        source.siteCd,
        fetchLimit,
        fetchOffset,
        source,
      );

      if (fetchOffset === 0) {
        total = pageResult.total;
      }

      fetchedRecords.push(
        ...pageResult.records.map((row) => ({
          emplCd: row.emplCd,
          accsDay: row.accsDay,
          inTime: row.inTime,
          outTime: row.outTime,
          partCd: row.partCd,
          name: row.name,
          companyName: row.companyName,
        })),
      );
      fetchOffset += pageResult.records.length;

      if (pageResult.records.length === 0) {
        break;
      }
    } while (fetchOffset < total);

    allRecords = fetchedRecords;
  } catch {
    const fallbackRecords = await fasGetDailyAttendance(
      hd,
      accsDay,
      source.siteCd,
      source,
    );
    allRecords = fallbackRecords.map((row) => ({
      emplCd: row.emplCd,
      accsDay: row.accsDay,
      inTime: row.inTime,
      outTime: row.outTime,
      partCd: row.partCd,
      name: row.emplCd,
      companyName: null,
    }));
  }

  const workerIds = [...new Set(allRecords.map((row) => row.emplCd))];
  const workerExternalIds = workerIds.map(
    (workerId) => `${source.workerIdPrefix}${workerId}`,
  );
  const linkedUsers: Array<{ externalWorkerId: string | null }> = [];
  for (
    let start = 0;
    start < workerExternalIds.length;
    start += LINKED_USER_QUERY_CHUNK_SIZE
  ) {
    const chunk = workerExternalIds.slice(
      start,
      start + LINKED_USER_QUERY_CHUNK_SIZE,
    );
    if (chunk.length === 0) {
      continue;
    }
    const chunkRows = await db
      .select({ externalWorkerId: users.externalWorkerId })
      .from(users)
      .where(
        and(inArray(users.externalWorkerId, chunk), isNull(users.deletedAt)),
      )
      .all();
    linkedUsers.push(...chunkRows);
  }
  const linkedWorkerIds = new Set(
    linkedUsers
      .map((row) => row.externalWorkerId)
      .filter((value): value is string => typeof value === "string"),
  );

  const unmatchedAll = allRecords.filter(
    (row) => !linkedWorkerIds.has(`${source.workerIdPrefix}${row.emplCd}`),
  );
  const pageRecords = unmatchedAll.slice(offset, offset + limit);
  const unmatchedRecords = pageRecords.map((row) => ({
    id: `${row.emplCd}-${row.accsDay}-${row.inTime ?? ""}`,
    externalWorkerId: `${source.workerIdPrefix}${row.emplCd}`,
    siteId: siteId,
    siteName: null,
    checkinAt: formatCheckinIso(row.accsDay, row.inTime),
    source: "FAS_REALTIME",
    createdAt: null,
    companyName: row.companyName,
    name: row.name,
    partCd: row.partCd,
    inTime: row.inTime,
    outTime: row.outTime,
    accsDay: row.accsDay,
  }));

  return success(c, {
    records: unmatchedRecords,
    requestedSource: source.dbName,
    requestedSiteCd: source.siteCd,
    requestedSiteName: source.d1SiteName,
    metric: {
      key: "unmatchedLogs",
      definition:
        "attendance logs whose externalWorkerId has no active linked user in D1 for the selected site/day",
    },
    pagination: {
      page,
      limit,
      total: unmatchedAll.length,
      totalPages: Math.ceil(unmatchedAll.length / limit),
    },
  });
});

export default app;
