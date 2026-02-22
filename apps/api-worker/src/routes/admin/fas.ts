import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, or, inArray, sql, desc, gte, lt, isNull } from "drizzle-orm";
import type { Env, AuthContext } from "../../types";
import {
  users,
  sites,
  siteMemberships,
  auditLogs,
  syncErrors,
  attendance,
} from "../../db/schema";
import { hmac, encrypt } from "../../lib/crypto";
import { success, error } from "../../lib/response";
import { createLogger } from "../../lib/logger";
import { AdminSyncWorkersSchema } from "../../validators/schemas";
import { dbBatch } from "../../db/helpers";
import { requireAdmin } from "./helpers";
import { runFasAttendanceSync } from "../../scheduled";
import {
  fasGetAllEmployeesPaginated,
  fasGetDailyAttendanceRawRows,
  fasGetDailyAttendanceRawSummary,
} from "../../lib/fas-mariadb";
import {
  syncFasEmployeesToD1,
  deactivateRetiredEmployees,
} from "../../lib/fas-sync";

interface FasWorkerInput {
  externalWorkerId: string;
  name: string;
  phone: string;
  dob: string;
}

interface SyncFasWorkersBody {
  siteId: string;
  workers: FasWorkerInput[];
}

const logger = createLogger("admin/fas");

const IN_QUERY_CHUNK_SIZE = 50;
const FAS_SITE_CD = "10";

function normalizeAccsDay(value: string | undefined): string | null {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, "");
  }
  return null;
}

function accsDayToUtcRange(accsDay: string): { start: Date; end: Date } {
  const year = Number(accsDay.slice(0, 4));
  const month = Number(accsDay.slice(4, 6)) - 1;
  const day = Number(accsDay.slice(6, 8));
  const start = new Date(Date.UTC(year, month, day, -9, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const app = new Hono<{
  Bindings: Env;
  Variables: { auth: AuthContext };
}>();

app.post(
  "/fas/sync-workers",
  requireAdmin,
  zValidator("json", AdminSyncWorkersSchema as never),
  async (c) => {
    const db = drizzle(c.env.DB);
    const { user: currentUser } = c.get("auth");

    c.req.valid("json");
    const body = (await c.req.raw.clone().json()) as SyncFasWorkersBody;

    if (!body.siteId || !Array.isArray(body.workers)) {
      return error(
        c,
        "MISSING_REQUIRED_FIELDS",
        "siteId and workers array required",
        400,
      );
    }

    const site = await db
      .select()
      .from(sites)
      .where(eq(sites.id, body.siteId))
      .get();

    if (!site) {
      return error(c, "SITE_NOT_FOUND", "Site not found", 404);
    }

    const results = {
      created: 0,
      updated: 0,
      membershipCreated: 0,
    };

    const processedWorkers: Array<{
      externalWorkerId: string;
      name: string;
      nameMasked: string;
      phoneHash: string;
      phoneEncrypted: string;
      dobHash: string;
      dobEncrypted: string;
    }> = [];

    for (const worker of body.workers) {
      if (
        !worker.externalWorkerId ||
        !worker.name ||
        !worker.phone ||
        !worker.dob
      ) {
        continue;
      }

      const normalizedPhone = worker.phone.replace(/[^0-9]/g, "");
      const phoneHash = await hmac(c.env.HMAC_SECRET, normalizedPhone);
      const dobHash = await hmac(c.env.HMAC_SECRET, worker.dob);
      const phoneEncrypted = await encrypt(
        c.env.ENCRYPTION_KEY,
        normalizedPhone,
      );
      const dobEncrypted = await encrypt(c.env.ENCRYPTION_KEY, worker.dob);

      processedWorkers.push({
        externalWorkerId: worker.externalWorkerId,
        name: worker.name,
        nameMasked:
          worker.name.length > 1
            ? worker.name[0] + "*".repeat(worker.name.length - 1)
            : worker.name,
        phoneHash,
        phoneEncrypted,
        dobHash,
        dobEncrypted,
      });
    }

    if (processedWorkers.length > 0) {
      const externalWorkerIds = [
        ...new Set(processedWorkers.map((worker) => worker.externalWorkerId)),
      ];
      const phoneHashes = [
        ...new Set(processedWorkers.map((worker) => worker.phoneHash)),
      ];

      const existingUsers: (typeof users.$inferSelect)[] = [];

      if (
        externalWorkerIds.length <= IN_QUERY_CHUNK_SIZE &&
        phoneHashes.length <= IN_QUERY_CHUNK_SIZE
      ) {
        const chunkUsers = await db
          .select()
          .from(users)
          .where(
            or(
              inArray(users.externalWorkerId, externalWorkerIds),
              inArray(users.phoneHash, phoneHashes),
            ),
          )
          .all();
        existingUsers.push(...chunkUsers);
      } else {
        for (const workerChunk of chunkArray(
          externalWorkerIds,
          IN_QUERY_CHUNK_SIZE,
        )) {
          const chunkUsers = await db
            .select()
            .from(users)
            .where(inArray(users.externalWorkerId, workerChunk))
            .all();
          existingUsers.push(...chunkUsers);
        }

        for (const phoneChunk of chunkArray(phoneHashes, IN_QUERY_CHUNK_SIZE)) {
          const chunkUsers = await db
            .select()
            .from(users)
            .where(inArray(users.phoneHash, phoneChunk))
            .all();
          existingUsers.push(...chunkUsers);
        }
      }

      const userByExternalWorkerId = new Map<
        string,
        typeof users.$inferSelect
      >();
      const userByPhoneHash = new Map<string, typeof users.$inferSelect>();

      for (const existingUser of existingUsers) {
        if (existingUser.externalWorkerId) {
          userByExternalWorkerId.set(
            existingUser.externalWorkerId,
            existingUser,
          );
        }
        if (existingUser.phoneHash) {
          userByPhoneHash.set(existingUser.phoneHash, existingUser);
        }
      }

      const usersToUpdate = new Map<
        string,
        {
          id: string;
          externalWorkerId: string;
          name: string;
          nameMasked: string;
          phoneHash: string;
          phoneEncrypted: string;
          dobHash: string;
          dobEncrypted: string;
          updatedAt: Date;
        }
      >();
      const usersToInsert: Array<typeof users.$inferInsert> = [];
      const membershipCandidateUserIds = new Set<string>();

      for (const worker of processedWorkers) {
        const existingUser =
          userByExternalWorkerId.get(worker.externalWorkerId) ||
          userByPhoneHash.get(worker.phoneHash);

        if (existingUser) {
          usersToUpdate.set(existingUser.id, {
            id: existingUser.id,
            externalWorkerId: worker.externalWorkerId,
            name: worker.name,
            nameMasked: worker.nameMasked,
            phoneHash: worker.phoneHash,
            phoneEncrypted: worker.phoneEncrypted,
            dobHash: worker.dobHash,
            dobEncrypted: worker.dobEncrypted,
            updatedAt: new Date(),
          });
          membershipCandidateUserIds.add(existingUser.id);
          results.updated++;
          continue;
        }

        usersToInsert.push({
          externalWorkerId: worker.externalWorkerId,
          externalSystem: "FAS",
          phoneHash: worker.phoneHash,
          phoneEncrypted: worker.phoneEncrypted,
          dobHash: worker.dobHash,
          dobEncrypted: worker.dobEncrypted,
          name: worker.name,
          nameMasked: worker.nameMasked,
          role: "WORKER",
        });
        results.created++;
      }

      if (usersToUpdate.size > 0) {
        const userUpdateOperations = Array.from(usersToUpdate.values()).map(
          (userToUpdate) =>
            db
              .update(users)
              .set({
                externalWorkerId: userToUpdate.externalWorkerId,
                name: userToUpdate.name,
                nameMasked: userToUpdate.nameMasked,
                phoneHash: userToUpdate.phoneHash,
                phoneEncrypted: userToUpdate.phoneEncrypted,
                dobHash: userToUpdate.dobHash,
                dobEncrypted: userToUpdate.dobEncrypted,
                updatedAt: userToUpdate.updatedAt,
              })
              .where(eq(users.id, userToUpdate.id))
              .run(),
        );
        await dbBatch<unknown[]>(db, userUpdateOperations);
      }

      if (usersToInsert.length > 0) {
        const insertedUsers = await db
          .insert(users)
          .values(usersToInsert)
          .returning()
          .all();

        for (const insertedUser of insertedUsers) {
          membershipCandidateUserIds.add(insertedUser.id);
        }
      }

      if (membershipCandidateUserIds.size > 0) {
        const candidateUserIds = Array.from(membershipCandidateUserIds);
        const existingMemberships: (typeof siteMemberships.$inferSelect)[] = [];

        for (const userIdChunk of chunkArray(
          candidateUserIds,
          IN_QUERY_CHUNK_SIZE,
        )) {
          const chunkMemberships = await db
            .select()
            .from(siteMemberships)
            .where(
              and(
                eq(siteMemberships.siteId, body.siteId),
                inArray(siteMemberships.userId, userIdChunk),
              ),
            )
            .all();
          existingMemberships.push(...chunkMemberships);
        }

        const existingMembershipUserIds = new Set(
          existingMemberships.map((membership) => membership.userId),
        );

        const membershipsToInsert = candidateUserIds
          .filter((userId) => !existingMembershipUserIds.has(userId))
          .map((userId) => ({
            userId,
            siteId: body.siteId,
            role: "WORKER" as const,
            status: "ACTIVE" as const,
          }));

        if (membershipsToInsert.length > 0) {
          await db.insert(siteMemberships).values(membershipsToInsert);
          results.membershipCreated += membershipsToInsert.length;
        }
      }
    }

    await db.insert(auditLogs).values({
      action: "FAS_WORKERS_SYNCED",
      actorId: currentUser.id,
      targetType: "SITE",
      targetId: body.siteId,
      reason: `Synced ${results.created} created, ${results.updated} updated, ${results.membershipCreated} memberships`,
    });

    return success(c, { results });
  },
);

// --- Temporary FAS MariaDB debug endpoint ---
app.get("/fas/search-mariadb", requireAdmin, async (c) => {
  const name = c.req.query("name");
  const phone = c.req.query("phone");

  if (!name && !phone) {
    return error(c, "VALIDATION_ERROR", "name or phone query param required");
  }

  const hd = c.env.FAS_HYPERDRIVE;
  if (!hd) {
    return error(c, "SERVICE_UNAVAILABLE", "FAS_HYPERDRIVE not configured");
  }

  try {
    const { fasSearchEmployeeByPhone, fasSearchEmployeeByName } =
      await import("../../lib/fas-mariadb");

    let results: unknown[] = [];
    if (phone) {
      const emp = await fasSearchEmployeeByPhone(hd, phone);
      results = emp ? [emp] : [];
    } else if (name) {
      results = await fasSearchEmployeeByName(hd, name);
    }

    return success(c, {
      query: { name, phone },
      count: results.length,
      results,
    });
  } catch (err) {
    return error(c, "INTERNAL_ERROR", String(err));
  }
});

app.get("/fas/sync-status", requireAdmin, async (c) => {
  const db = drizzle(c.env.DB);
  const requestedAccsDayRaw = c.req.query("accsDay") ?? c.req.query("date");
  const requestedAccsDay = normalizeAccsDay(requestedAccsDayRaw);
  const siteCdRaw = c.req.query("siteCd");
  if (
    siteCdRaw &&
    siteCdRaw.toLowerCase() !== "all" &&
    siteCdRaw !== FAS_SITE_CD
  ) {
    return error(c, "VALIDATION_ERROR", `siteCd must be ${FAS_SITE_CD}`, 400);
  }
  const normalizedSiteCd = FAS_SITE_CD;

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
      attendanceRows: number;
      checkedInWorkers: number;
      attendanceRowsGlobal: number;
    };
    gaps: {
      unlinkedWorkers: number;
      checkinsNotInD1Estimate: number;
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
      normalizedSiteCd,
    );
    const workerIds = rawSummary.workerIds;

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

    const { start, end } = accsDayToUtcRange(requestedAccsDay);
    const d1AttendanceGlobalRow = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.source, "FAS"),
          gte(attendance.checkinAt, start),
          lt(attendance.checkinAt, end),
        ),
      )
      .get();

    let scopedAttendanceRows = 0;
    let scopedCheckedInWorkers = 0;
    for (const chunk of chunkArray(workerIds, IN_QUERY_CHUNK_SIZE)) {
      if (chunk.length === 0) continue;

      const scopedRow = await db
        .select({
          count: sql<number>`count(*)`,
          checkedInWorkers: sql<number>`count(distinct ${attendance.externalWorkerId})`,
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.source, "FAS"),
            gte(attendance.checkinAt, start),
            lt(attendance.checkinAt, end),
            inArray(attendance.externalWorkerId, chunk),
          ),
        )
        .get();

      scopedAttendanceRows += scopedRow?.count ?? 0;
      scopedCheckedInWorkers += scopedRow?.checkedInWorkers ?? 0;
    }

    const attendanceRowsGlobal = d1AttendanceGlobalRow?.count ?? 0;
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
        attendanceRows: scopedAttendanceRows,
        checkedInWorkers: scopedCheckedInWorkers,
        attendanceRowsGlobal,
      },
      gaps: {
        unlinkedWorkers: Math.max(rawSummary.uniqueWorkers - linkedWorkers, 0),
        checkinsNotInD1Estimate: Math.max(
          rawSummary.checkins - scopedAttendanceRows,
          0,
        ),
      },
    };
  }

  return success(c, {
    fasStatus,
    lastFullSync,
    userStats,
    syncErrorCounts,
    requestedAccsDay: requestedAccsDay ?? null,
    requestedSiteCd: normalizedSiteCd ?? "all",
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
  const siteCdRaw = c.req.query("siteCd");
  if (
    siteCdRaw &&
    siteCdRaw.toLowerCase() !== "all" &&
    siteCdRaw !== FAS_SITE_CD
  ) {
    return error(c, "VALIDATION_ERROR", `siteCd must be ${FAS_SITE_CD}`, 400);
  }
  const normalizedSiteCd = FAS_SITE_CD;
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
    normalizedSiteCd,
    limit,
  );

  return success(c, {
    requestedAccsDay,
    requestedSiteCd: normalizedSiteCd ?? "all",
    source: raw.source,
    count: raw.rows.length,
    rows: raw.rows,
  });
});

app.post("/fas/sync-hyperdrive", requireAdmin, async (c) => {
  if (!c.env.FAS_HYPERDRIVE) {
    return error(c, "SERVICE_UNAVAILABLE", "FAS_HYPERDRIVE not configured");
  }

  try {
    const { user: currentUser } = c.get("auth");
    const body = (await c.req
      .json<{
        offset?: number;
        limit?: number;
        runAttendance?: boolean;
        accsDay?: string;
      }>()
      .catch(() => ({}))) as {
      offset?: number;
      limit?: number;
      runAttendance?: boolean;
      accsDay?: string;
    };

    const offset = Number.isFinite(body.offset)
      ? Math.max(0, Math.trunc(body.offset as number))
      : 0;
    const limit = Number.isFinite(body.limit)
      ? Math.min(500, Math.max(1, Math.trunc(body.limit as number)))
      : 100;
    const runAttendance = body.runAttendance !== false;
    const normalizedAccsDay = normalizeAccsDay(body.accsDay);
    if (body.accsDay && !normalizedAccsDay) {
      return error(
        c,
        "VALIDATION_ERROR",
        "accsDay must be YYYYMMDD or YYYY-MM-DD",
        400,
      );
    }

    const db = drizzle(c.env.DB);
    const runId = crypto.randomUUID();

    await db.insert(auditLogs).values({
      action: "FAS_HYPERDRIVE_SYNC_TRIGGERED",
      actorId: currentUser.id,
      targetType: "FAS_SYNC",
      targetId: runId,
      reason: JSON.stringify({
        offset,
        limit,
        runAttendance,
        accsDay: normalizedAccsDay ?? null,
      }),
    });

    const { employees, total } = await fasGetAllEmployeesPaginated(
      c.env.FAS_HYPERDRIVE,
      offset,
      limit,
    );

    const activeEmployees = employees.filter((e) => e.stateFlag === "W");
    const retiredEmplCds = employees
      .filter((e) => e.stateFlag !== "W")
      .map((e) => e.emplCd);

    const syncResult = await syncFasEmployeesToD1(activeEmployees, db, {
      HMAC_SECRET: c.env.HMAC_SECRET,
      ENCRYPTION_KEY: c.env.ENCRYPTION_KEY,
    });

    let deactivated = 0;
    if (retiredEmplCds.length > 0) {
      deactivated = await deactivateRetiredEmployees(retiredEmplCds, db);
    }

    if (runAttendance) {
      await runFasAttendanceSync(c.env, normalizedAccsDay ?? undefined);
    }

    const hasMore = offset + employees.length < total;
    const nextOffset = hasMore ? offset + employees.length : null;

    await db.insert(auditLogs).values({
      action: "FAS_HYPERDRIVE_SYNC_COMPLETED",
      actorId: currentUser.id,
      targetType: "FAS_SYNC",
      targetId: runId,
      reason: JSON.stringify({
        offset,
        limit,
        fetched: employees.length,
        total,
        active: activeEmployees.length,
        retired: retiredEmplCds.length,
        created: syncResult.created,
        updated: syncResult.updated,
        skipped: syncResult.skipped,
        errors: syncResult.errors.length,
        deactivated,
        hasMore,
        nextOffset,
        runAttendance,
        accsDay: normalizedAccsDay ?? null,
      }),
    });

    return success(c, {
      message: "Hyperdrive sync completed",
      runId,
      batch: {
        offset,
        limit,
        fetched: employees.length,
        total,
        hasMore,
        nextOffset,
      },
      sync: syncResult,
      deactivated,
    });
  } catch (err) {
    try {
      const db = drizzle(c.env.DB);
      const { user: currentUser } = c.get("auth");
      await db.insert(auditLogs).values({
        action: "FAS_HYPERDRIVE_SYNC_FAILED",
        actorId: currentUser.id,
        targetType: "FAS_SYNC",
        targetId: crypto.randomUUID(),
        reason: JSON.stringify({
          message: err instanceof Error ? err.message : String(err),
        }),
      });
    } catch (auditErr) {
      logger.warn("Failed to write FAS sync failure audit log", {
        action: "fas_hyperdrive_sync_failed_audit_log_error",
        error: {
          name: "AuditLogWriteError",
          message:
            auditErr instanceof Error ? auditErr.message : String(auditErr),
        },
      });
    }
    return error(c, "INTERNAL_ERROR", String(err));
  }
});

export default app;
